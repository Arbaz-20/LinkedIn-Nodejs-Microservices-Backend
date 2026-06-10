# Architecture

## Overview

The backend is decomposed into **10 independent services** plus a **shared library**. Services are
isolated by data and deployment: each owns its database (or datastore) and is built, shipped, and
scaled on its own. They collaborate two ways:

- **Asynchronously via RabbitMQ** — the default. Domain events (a post was created, a connection
  was accepted) are published to exchanges; interested services consume them. See
  [events.md](events.md).
- **Synchronously via HTTP** — the exception, used only when a request truly needs another
  service's data within the request lifecycle. Today the only such call is the feed (post-service
  → connection-service).

```
                              ┌────────────────┐
   Client ───HTTP:80──▶  NGINX (reverse proxy) │
                              └───────┬────────┘
                    /api/auth/*       │        /api/* (everything else)
                          │           ▼
                          │     ┌────────────┐
                          │     │ api-gateway │  verify JWT → inject headers → proxy
                          │     └─────┬──────┘
                          ▼           ▼
                 ┌──────────────────────────────────────────────────┐
                 │  auth · user · connection · post · messaging ·    │
                 │  notification · search · media · job              │
                 └──────────────────────────────────────────────────┘
                     │            │             │            │
                 PostgreSQL    RabbitMQ       Redis     Elasticsearch / MinIO
```

## Service decomposition

| Service | Port | Datastore | Responsibility |
|---------|------|-----------|----------------|
| api-gateway | 3000 | — | Routing, JWT verification, header injection, rate limiting |
| auth-service | 3001 | `auth_db` | Registration, login, token lifecycle, password reset, OAuth |
| user-service | 3002 | `user_db` | Profiles, experience, education, skills, endorsements, certifications |
| connection-service | 3003 | `connection_db` | Connection requests, follow/unfollow, blocking |
| post-service | 3004 | `post_db` | Posts, comments, reactions, hashtags, feed |
| messaging-service | 3005 | `messaging_db` | Conversations, messages, read receipts |
| notification-service | 3006 | `notification_db` | Notifications (in-app + email), preferences |
| search-service | 3007 | Elasticsearch | Full-text search for users, posts, jobs, companies |
| media-service | 3008 | `media_db` + MinIO | Upload, presigned URLs, media metadata |
| job-service | 3009 | `job_db` | Jobs, applications, saved jobs, companies |

## The API gateway

[`services/api-gateway`](../services/api-gateway) is the single authenticated entry point for all
non-auth traffic. NGINX terminates the public port and routes:

- `/api/auth/*` → straight to **auth-service** (no JWT required — this is where tokens are minted).
- `/api/*` (everything else) → **api-gateway**, which verifies the JWT and proxies onward.

For each protected route the gateway:

1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the access token with `JWT_ACCESS_SECRET`.
3. Injects `x-user-id` and `x-user-role` headers.
4. Proxies the request to the target service with `http-proxy-middleware`.

```ts
// services/api-gateway/src/middleware/authenticate.ts (shape)
const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
req.headers['x-user-id']   = payload.sub;
req.headers['x-user-role'] = payload.role;
```

Downstream services **never parse JWTs**. The shared `requireUser` / `optionalUser` / `requireRole`
middleware reads the injected headers into `req.userId` / `req.userRole`. This keeps token logic in
exactly one place and lets services stay stateless about auth.

## Auth & token model

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 min | `Authorization` header (client memory) | API authentication |
| Refresh token | 7 days | `httpOnly` cookie **+** `refresh_tokens` DB row | Silent renewal |

**Access token payload:**

```ts
interface JwtPayload {
  sub: string;                                 // userId
  email: string;
  role: 'USER' | 'ADMIN' | 'RECRUITER';
  iat: number;
  exp: number;
}
```

**Refresh flow (rotation):**

```
POST /api/auth/refresh  (httpOnly cookie)
  → auth-service validates the refresh token row in auth_db
  → deletes the old row, issues a NEW access + refresh pair  (rotation)
  → returns new accessToken in the body, new refreshToken in the cookie
```

Rotation means a stolen refresh token is invalidated as soon as the legitimate client refreshes.

## The shared package

[`packages/shared`](../packages/shared) (`@linkedin-clone/shared`) holds everything more than one
service needs, so the cross-cutting behavior stays consistent:

| Area | Exports |
|------|---------|
| `constants/` | RabbitMQ exchange/queue names, routing keys, the `EventEnvelope` shape |
| `errors/` | `AppError` + typed subclasses (`BadRequest`, `NotFound`, `Unauthorized`, …) |
| `http/` | `ok()` / `created()` / `noContent()` response envelopes |
| `middleware/` | `errorHandler`, `notFoundHandler`, `validate` (zod), `requireUser`/`requireRole`, `rateLimiter` |
| `rabbitmq/` | connection pool manager, `publishEvent()` (confirm + retry), `registerConsumer()` (DLQ + backoff) |
| `redis/` | ioredis singleton (`getRedis` / `closeRedis`) |
| `logger/` | Pino structured logger (`createLogger`) |
| `utils/` | `asyncHandler`, cursor & offset pagination helpers |

Services import from the barrel: `import { requireUser, AppError, publishEvent } from '@linkedin-clone/shared'`.
The shared package compiles to `dist/` and must be built before (or in watch alongside) the
services that consume it.

## Service internal layering

Every Postgres-backed service uses the same one-way dependency flow:

```
routes ─▶ controllers ─▶ services ─▶ repositories ─▶ models (Sequelize)
                            │
                            └─▶ events/publishers.ts   (emit domain events)
                            └─▶ events/consumers.ts    (handle inbound events, where needed)
```

- **routes** — Express routers; attach `validate(schema)` and `requireUser`.
- **controllers** — thin; translate HTTP ↔ service calls, send envelopes.
- **services** — business logic; orchestrate repositories + publishers.
- **repositories** — the *only* place Sequelize queries live.
- **models** — `Model.init` definitions; associations wired in `models/index.ts`.

`search-service` omits `models/`, `db/`, `migrations/` (it uses Elasticsearch);
`media-service` additionally has `storage/minio.ts`.

## Request lifecycle (worked example)

**Client likes a post:**

1. `POST /api/posts/:id/react` hits NGINX → api-gateway.
2. Gateway verifies the JWT, injects `x-user-id`/`x-user-role`, proxies to post-service.
3. post-service `requireUser` populates `req.userId`; `validate` checks the body.
4. `reaction.service` upserts the reaction via `reaction.repository`, bumps `likesCount`.
5. It publishes `post.reacted` to the `post.events` exchange and returns `201` with an envelope.
6. RabbitMQ routes the event to `notify.post.reaction`; notification-service consumes it and writes
   a `POST_LIKE` notification row for the post's author.

The HTTP response does not wait on notification creation — that happens asynchronously.

## Bootstrap & graceful shutdown

Each `server.ts` follows the same lifecycle:

```ts
await assertDbConnection();          // verify Postgres reachable
await rabbit.connect(RABBITMQ_URL);  // open channel pool
await registerConsumers();           // only in services that consume events
if (REDIS_URL) getRedis(REDIS_URL);  // optional cache
const server = app.listen(PORT);

// SIGTERM / SIGINT → close server, rabbit, redis, sequelize, then exit
```

Config is parsed and validated with zod at startup, so a misconfigured service fails fast rather
than failing on first request.

## Cross-cutting concerns

- **Errors** — thrown `AppError`s are caught by the shared `errorHandler` and serialized to a
  consistent JSON shape; unknown errors become `500`s with the detail logged, not leaked.
- **Validation** — request bodies/queries are validated with zod via the `validate` middleware.
- **Rate limiting** — token-bucket limiter backed by Redis (`rate:<ip>:<endpoint>`).
- **Caching** — Redis with TTLs per key pattern (profiles, connection lists, feed pages, unread
  counts, presence, typing). See the caching table in
  [`../linkedin-clone-backend-plan.md`](../linkedin-clone-backend-plan.md#15-redis-caching-strategy).
- **Logging** — structured Pino logs with a per-service name.
