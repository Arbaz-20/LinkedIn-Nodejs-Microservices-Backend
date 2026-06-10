# LinkedIn Clone — Microservices Backend

A production-style **LinkedIn clone backend** built as a set of independent microservices. Each
service owns its own database, exposes a REST API, and communicates with the others
**asynchronously over RabbitMQ** (events) and **synchronously over HTTP** (only where a request
genuinely needs another service's data, e.g. feed generation).

**Stack:** TypeScript · Node.js 20 · Express 4 · Sequelize 6 (+ sequelize-cli migrations) ·
PostgreSQL 16 · Redis 7 · RabbitMQ 3.13 · Elasticsearch 8 · MinIO (S3) · Docker · NGINX ·
GitHub Actions · npm workspaces.

> Full design rationale lives in [`linkedin-clone-backend-plan.md`](linkedin-clone-backend-plan.md)
> and the original spec under [`docs/superpowers/specs/`](docs/superpowers/specs/). This README is
> the practical entry point; deeper topics are split into [`docs/`](docs/).

---

## Table of Contents

1. [Architecture at a glance](#architecture-at-a-glance)
2. [Services](#services)
3. [Repository layout](#repository-layout)
4. [Quick start](#quick-start)
5. [Local development](#local-development)
6. [Environment variables](#environment-variables)
7. [Database & migrations](#database--migrations)
8. [How a request flows](#how-a-request-flows)
9. [Event-driven communication](#event-driven-communication)
10. [API reference](#api-reference)
11. [Deployment & CI/CD](#deployment--cicd)
12. [Documentation index](#documentation-index)
13. [Project status & known gaps](#project-status--known-gaps)

---

## Architecture at a glance

```
                              ┌────────────────┐
   Client ───HTTP:80──▶  NGINX (reverse proxy) │
                              └───────┬────────┘
                    /api/auth/*       │        /api/* (everything else)
                          │           ▼
                          │     ┌────────────┐  verifies JWT, injects
                          │     │ api-gateway │  x-user-id / x-user-role
                          │     └─────┬──────┘  then proxies to the service
                          ▼           ▼
                 ┌──────────────────────────────────────────────────┐
                 │  auth · user · connection · post · messaging ·    │
                 │  notification · search · media · job  (services)  │
                 └──────────────────────────────────────────────────┘
                     │            │             │            │
                 PostgreSQL    RabbitMQ       Redis     Elasticsearch / MinIO
                 (per service) (events bus)  (cache)    (search / object store)
```

Key principles:

- **Database-per-service.** No service reads another service's tables. One PostgreSQL instance,
  one logical database per service (`auth_db`, `user_db`, …).
- **Gateway owns identity.** Only the gateway verifies JWTs. It injects `x-user-id` /
  `x-user-role` headers; downstream services trust those headers via the shared `requireUser`
  middleware and never parse tokens themselves.
- **Async-first.** Cross-service side effects (notifications, search indexing, media processing)
  happen via RabbitMQ events with dead-letter queues and retry/backoff. HTTP between services is
  the exception, used only by the feed.
- **Shared code, not shared database.** Common concerns (errors, HTTP envelopes, RabbitMQ/Redis
  helpers, logger, middleware) live in [`packages/shared`](packages/shared) and are imported as
  `@linkedin-clone/shared`.

---

## Services

| Service | Port | Datastore | Responsibility |
|---------|------|-----------|----------------|
| **api-gateway** | 3000 | — | JWT verification, header injection, request proxying, rate limiting |
| **auth-service** | 3001 | `auth_db` | Registration, login, JWT issue/rotation, password reset, OAuth |
| **user-service** | 3002 | `user_db` | Profiles, experience, education, skills, endorsements, certifications |
| **connection-service** | 3003 | `connection_db` | Connection requests, follow/unfollow, blocking, mutual connections |
| **post-service** | 3004 | `post_db` | Posts, comments (threaded), reactions, hashtags, feed generation |
| **messaging-service** | 3005 | `messaging_db` | 1:1 & group conversations, messages, read receipts |
| **notification-service** | 3006 | `notification_db` | In-app + email notifications, preferences (event consumer) |
| **search-service** | 3007 | Elasticsearch | Full-text search over users, posts, jobs, companies (event consumer) |
| **media-service** | 3008 | `media_db` + MinIO | File upload, presigned URLs, image metadata |
| **job-service** | 3009 | `job_db` | Jobs, applications, saved jobs, company pages |

Every Postgres-backed service follows the **same layered structure**:

```
routes → controllers → services (business logic) → repositories (all DB access) → models
                            │
                            └─▶ events/publishers · events/consumers (RabbitMQ)
```

---

## Repository layout

```
LinkedIn-Nodejs-Backend/
├── README.md                     ← you are here
├── linkedin-clone-backend-plan.md← full architecture/design document
├── docs/                         ← focused documentation (see index below)
├── package.json                  ← npm workspaces root + scripts
├── tsconfig.base.json            ← shared TS compiler options
├── scripts/
│   └── dev.js                    ← dev orchestrator (watch shared + run all services)
├── packages/
│   └── shared/                   ← @linkedin-clone/shared (errors, rabbitmq, redis, mw, logger…)
├── services/
│   ├── api-gateway/   auth-service/   user-service/   connection-service/
│   ├── post-service/  messaging-service/  notification-service/
│   └── search-service/  media-service/  job-service/
├── infra/
│   ├── docker-compose.yml        ← full local stack
│   ├── docker-compose.prod.yml   ← production overrides (pull prebuilt images)
│   ├── init-databases.sql        ← creates one Postgres DB per service
│   └── nginx/nginx.conf          ← reverse proxy config
└── .github/workflows/
    ├── ci.yml                    ← lint, typecheck, test, build & push images
    └── deploy.yml                ← SSH rolling deploy on successful CI
```

Each service directory has the same shape:

```
services/<name>-service/
├── src/
│   ├── config/        env parsing + validation (zod)
│   ├── models/        Sequelize Model.init + associations (index.ts)
│   ├── repositories/  all DB access
│   ├── services/      business logic
│   ├── controllers/   HTTP handlers
│   ├── routes/        Express routers
│   ├── validators/    zod request schemas
│   ├── events/        publishers.ts / consumers.ts (RabbitMQ)
│   ├── db/sequelize.ts
│   ├── app.ts         Express app
│   └── server.ts      bootstrap + graceful shutdown
├── migrations/        sequelize-cli migrations
├── config/config.js   sequelize-cli datasource (reads DATABASE_URL)
├── .sequelizerc
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

---

## Quick start

**Prerequisites:** Node.js ≥ 20, Docker + Docker Compose, npm.

```bash
# 1. Install all workspace dependencies
npm install

# 2. Create your local env file
cp .env.example .env        # then edit secrets as needed

# 3. Start infrastructure (postgres, rabbitmq, redis, elasticsearch, minio)
npm run infra:up

# 4. Build the shared package (services import its compiled dist)
npm run build:shared

# 5. Run migrations for every Postgres service
npm run db:migrate

# 6. Start all services in watch mode (shared rebuilds on change too)
npm run dev
```

Once running:

| What | URL |
|------|-----|
| API (through NGINX → gateway) | http://localhost:80/api |
| API gateway (direct) | http://localhost:3000 |
| RabbitMQ management UI | http://localhost:15672 |
| MinIO console | http://localhost:9001 |
| Elasticsearch | http://localhost:9200 |

To run the **entire stack in Docker** instead of locally:

```bash
npm run docker:up      # build + start everything
npm run docker:logs    # tail logs
npm run docker:down    # stop
```

---

## Local development

`npm run dev` runs [`scripts/dev.js`](scripts/dev.js), which:

1. builds `packages/shared` in `--watch` mode, then
2. discovers every service that defines a `dev` script and starts it concurrently
   (each service uses `tsx watch` for hot reload).

New services are picked up automatically — no need to edit the orchestrator.

### Root npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Watch shared + run all services concurrently |
| `npm run build` | Build every workspace (`--if-present`) |
| `npm run build:shared` | Build only `@linkedin-clone/shared` |
| `npm run typecheck` | Type-check every workspace |
| `npm run lint` | Lint every workspace (`--if-present`) |
| `npm test` | Run tests in every workspace (`--if-present`) |
| `npm run db:migrate` | Run pending migrations across all services |
| `npm run db:seed` | Run seeders across all services |
| `npm run infra:up` | Start only the backing infra containers |
| `npm run docker:up` / `:down` / `:logs` / `:build` | Manage the full Docker stack |

### Per-service scripts

Run inside a single workspace with `-w`:

```bash
npm run dev   -w @linkedin-clone/auth-service     # run one service
npm run build -w @linkedin-clone/post-service     # build one service
npm run db:migrate      -w @linkedin-clone/user-service
npm run db:migrate:undo -w @linkedin-clone/user-service
```

---

## Environment variables

All configuration is supplied through environment variables; each service validates its own
config with zod at boot and **fails fast** on missing/invalid values. The root
[`.env.example`](.env.example) documents every variable. Highlights:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | gateway, auth | Sign/verify access & refresh tokens (≥ 32 chars) |
| `POSTGRES_PASSWORD` | all Postgres services | DB credential (composed into `DATABASE_URL`) |
| `RABBITMQ_PASSWORD` | all services | Broker credential |
| `REDIS_PASSWORD` | gateway + cache users | Redis auth |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_PUBLIC_URL` | media | Object storage |
| `GOOGLE_*` / `GITHUB_*` | auth | OAuth credentials |
| `SMTP_*` / `EMAIL_FROM` | notification | Outbound email |
| `CLIENT_URL` | all | CORS origin |
| `LOG_LEVEL` | all | Pino log level |
| `IMAGE_PREFIX` / `IMAGE_TAG` | prod compose | Image coordinates pulled during deploy |

In Docker, each service's `DATABASE_URL` / `RABBITMQ_URL` / `REDIS_URL` are composed from these
secrets in [`infra/docker-compose.yml`](infra/docker-compose.yml).

---

## Database & migrations

- One PostgreSQL instance; **one database per service**, created by
  [`infra/init-databases.sql`](infra/init-databases.sql).
- Schema is managed exclusively with **sequelize-cli migrations** under each service's
  `migrations/` directory. **Models are never auto-synced** — production schema only changes via
  migrations.
- All tables use **UUID primary keys** (`gen_random_uuid()`), `snake_case` columns
  (`underscored: true`), and explicit indexes/constraints.

```bash
# Apply all pending migrations everywhere
npm run db:migrate

# Single service
npm run db:migrate      -w @linkedin-clone/auth-service
npm run db:migrate:undo -w @linkedin-clone/auth-service

# Generate a new migration after a model change
npx sequelize-cli migration:generate --name add_oauth_fields \
  --options-path services/auth-service/.sequelizerc
```

`search-service` has no relational DB — its Elasticsearch indices (`users`, `posts`, `jobs`,
`companies`) are asserted at boot. See [docs/data-models.md](docs/data-models.md) for full schemas.

---

## How a request flows

Example: **client likes a post.**

```
Client ──Bearer JWT──▶ NGINX ──▶ api-gateway
   │                                  │ verifies JWT, sets x-user-id / x-user-role
   │                                  ▼
   │                          post-service  POST /api/posts/:id/react
   │                                  │ requireUser reads headers → req.userId
   │                                  │ reaction.service persists the reaction
   │                                  │ publishes `post.reacted` to post.events
   │                                  ▼
   │                          ◀─ 201 Created (envelope)
   ▼
RabbitMQ (post.events) ──▶ notify.post.reaction ──▶ notification-service
                                                     creates a notification row
```

The gateway is the only JWT-aware component; services trust the injected headers. See
[docs/architecture.md](docs/architecture.md) for the auth/token model in detail.

---

## Event-driven communication

Services publish domain events to **topic/direct exchanges**; consumers bind queues with routing
keys. Every queue has a dead-letter exchange (`dlq.<domain>`); failed messages retry with
exponential backoff (1s → 5s → 25s) before landing in the DLQ.

```
connection.events ─ connection.requested ─▶ notify.connection.request
                   ─ connection.accepted  ─▶ notify.connection.accepted
                   ─ connection.*          ─▶ search.index.user
post.events       ─ post.created          ─▶ search.index.post
                   ─ post.reacted          ─▶ notify.post.reaction
                   ─ post.commented        ─▶ notify.comment
user.events       ─ user.registered/updated▶ search.index.user
job.events        ─ job.created           ─▶ search.index.job
                   ─ job.applied           ─▶ notify.job.application
media.processing  ─ resize / thumbnail    ─▶ (media workers — see status note)
```

Full topology, payload envelope, and per-queue bindings: [docs/events.md](docs/events.md).

---

## API reference

All routes are served under `/api` through the gateway. A condensed map:

| Service | Base path | Examples |
|---------|-----------|----------|
| auth | `/api/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout` |
| user | `/api/users` | `GET /me`, `PUT /me`, `GET/POST /me/experience`, `POST /me/skills/:id/endorse` |
| connection | `/api/connections` | `POST /request`, `PUT /request/:id/accept`, `POST /follow/:userId` |
| post | `/api/posts` | `GET /feed`, `POST /`, `POST /:id/react`, `GET /:id/comments` |
| messaging | `/api/messaging` | `GET/POST /conversations`, `POST /conversations/:id/messages` |
| notification | `/api/notifications` | `GET /`, `GET /unread-count`, `PUT /read-all`, `GET/PUT /preferences` |
| search | `/api/search` | `GET /users?q=`, `GET /posts?q=`, `GET /autocomplete?q=` |
| media | `/api/media` | `POST /upload`, `POST /upload/presigned`, `GET/DELETE /:id` |
| job | `/api/jobs` | `GET /`, `POST /`, `POST /:id/apply`, `GET /me/saved`, `GET/POST /companies` |

The **complete, per-endpoint reference** (every route, method, and purpose) is in
[docs/api-reference.md](docs/api-reference.md).

---

## Deployment & CI/CD

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — on push/PR: install, build
  shared, lint, typecheck, test (with Postgres + Redis service containers), then build & push a
  Docker image per changed service to GHCR. Changed services are detected with `paths-filter`.
- **Deploy** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) — on successful CI on
  `main`: SSH to the host and perform a **one-service-at-a-time rolling update** using
  `docker-compose.yml` + `docker-compose.prod.yml`.

Each service ships a two-stage Dockerfile (build shared → build service → slim runtime). Details:
[docs/deployment.md](docs/deployment.md).

---

## Documentation index

| Doc | Contents |
|-----|----------|
| [docs/architecture.md](docs/architecture.md) | Service decomposition, gateway/auth model, shared package, request lifecycle |
| [docs/api-reference.md](docs/api-reference.md) | Every endpoint for every service |
| [docs/data-models.md](docs/data-models.md) | All Sequelize models, columns, indexes, ES indices |
| [docs/events.md](docs/events.md) | RabbitMQ exchanges, queues, routing keys, DLQ/retry, event envelope |
| [docs/development.md](docs/development.md) | Local setup, scripts, migrations, conventions, adding a service |
| [docs/deployment.md](docs/deployment.md) | Docker, compose files, CI/CD, rolling deploy |
| [linkedin-clone-backend-plan.md](linkedin-clone-backend-plan.md) | Original full design document |

---

## Project status & known gaps

**Implemented:** all 10 services (models, repositories, services, controllers, routes, validators,
migrations, Dockerfiles, `.env.example`), the shared package, infra (compose, nginx,
init-databases), and CI/CD workflows.

**Outstanding work:**

| Area | Status |
|------|--------|
| **Automated tests** | No test files yet; CI's `npm test` step is currently a no-op. |
| **Lint config** | No ESLint/Prettier config or per-service `lint` scripts; CI `lint` passes vacuously. |
| **Media workers** | `media-service` *publishes* `media.resize` / `media.thumbnail` jobs, but the consumer workers that actually resize/thumbnail images are not built — media stays in `PROCESSING`. |

See the bottom of [docs/development.md](docs/development.md) for the suggested order to close
these gaps.
