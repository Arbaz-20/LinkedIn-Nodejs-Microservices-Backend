# LinkedIn Clone — Microservices Backend Design

**Date:** 2026-06-04
**Status:** Approved — implementation in progress

## Summary

A LinkedIn-style backend built as a **microservices monorepo**. The architecture
follows the provided plan document; the data layer and tooling are adapted to house
conventions: **Sequelize + Repository pattern** instead of Prisma, **npm workspaces**
instead of pnpm + Turborepo, and **sequelize-cli migrations** per service.

## Decisions (locked)

| Area | Decision |
|------|----------|
| Architecture | 10 services + api-gateway + shared package + infra, per plan |
| Language | TypeScript on Node.js 20, Express 4 |
| Data layer | Sequelize + PostgreSQL, **Repository pattern** (model → repository → service → controller → router) |
| DB isolation | One database per service (`auth_db`, `user_db`, …); services never touch each other's DB |
| Monorepo | **npm workspaces** (no Turborepo); root scripts loop over services |
| Migrations | **sequelize-cli** per service, own migration history |
| Messaging | RabbitMQ via amqplib — channel pool, topic/direct exchanges, DLQ + retry/backoff |
| Cache | Redis (ioredis) — profile/feed/connection caches, rate limiting, presence/typing |
| Auth | Only api-gateway verifies JWT; injects `x-user-id` / `x-user-role` headers; services trust them |
| Validation | Zod per route via shared middleware |
| Logging | Pino structured logger (shared) |
| Search | Elasticsearch (search-service) |
| Media | MinIO/S3 (media-service) + `media_db` |
| Containers | Docker + docker-compose; NGINX front proxy |
| CI/CD | GitHub Actions (lint/test/build, per-service Docker build & push) |

## Build Sequencing (Foundation first, then vertical slices)

1. **Phase 1 — Foundation:** monorepo root (npm workspaces, tsconfig base, env example),
   `packages/shared` (rabbitmq, redis, logger, middleware, errors, http, utils, constants),
   `infra` (docker-compose, init-databases.sql, nginx.conf). Repo runnable: infra up + shared builds.
2. **Phase 2 — api-gateway:** JWT verify, rate limiting, http-proxy route map.
3. **Phase 3 — auth-service:** register/login/refresh/logout/forgot/reset/verify/oauth, tokens, events.
4. **Phase 4 — user-service:** profile, experience, education, skills, certifications, endorsements.
5. **Phase 5 — connection-service:** connections, follows, blocks, mutuals, events.
6. **Phase 6 — post-service:** posts, comments, reactions, hashtags, feed, events.
7. **Phase 7 — messaging-service:** conversations, messages, read receipts, presence/typing (Redis).
8. **Phase 8 — notification-service:** consumers for all events, preferences, in-app/email.
9. **Phase 9 — search-service:** Elasticsearch indexing consumers + search endpoints.
10. **Phase 10 — media-service:** MinIO upload/presigned, resize/thumbnail workers.
11. **Phase 11 — job-service:** companies, jobs, applications, saved jobs, events.
12. **Phase 12 — CI/CD + polish:** GitHub Actions, prod compose, READMEs.

Each phase is reviewed before the next.

## Service / Port / DB Map

| Service | Port | Database |
|---------|------|----------|
| api-gateway | 3000 | — |
| auth-service | 3001 | auth_db |
| user-service | 3002 | user_db |
| connection-service | 3003 | connection_db |
| post-service | 3004 | post_db |
| messaging-service | 3005 | messaging_db |
| notification-service | 3006 | notification_db |
| search-service | 3007 | Elasticsearch |
| media-service | 3008 | media_db |
| job-service | 3009 | job_db |

## Per-Service Structure

```
services/<name>-service/
├── src/
│   ├── config/        env parse + validate
│   ├── db/            sequelize instance + connection
│   ├── models/        Sequelize models (init + associations)
│   ├── repositories/  data-access layer (all queries)
│   ├── services/      business logic + event publishing
│   ├── controllers/   thin HTTP handlers
│   ├── routes/        express routers + Zod validation
│   ├── events/        publishers.ts + consumers.ts
│   ├── middleware/    auth (reads x-user-id)
│   ├── app.ts
│   └── server.ts
├── migrations/        sequelize-cli
├── config/config.js   sequelize-cli datasource
├── .sequelizerc
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

## Shared Package (`@linkedin-clone/shared`)

```
packages/shared/src/
├── constants/   queues.ts (EXCHANGES, QUEUES), events.ts (routing keys)
├── rabbitmq/    connection.ts (pool + reconnect), publisher.ts, consumer.ts (DLQ + backoff)
├── redis/       client.ts (ioredis singleton)
├── logger/      index.ts (pino)
├── middleware/  errorHandler.ts, validate.ts, rateLimiter.ts
├── errors/      AppError.ts + subclasses
├── http/        respond.ts (uniform envelope)
└── utils/       asyncHandler.ts, pagination.ts
```

## RabbitMQ Topology

Exchanges: `user.events`, `post.events`, `connection.events`, `job.events` (topic);
`notification.direct`, `media.processing` (direct). Each consumer queue bound to a
dead-letter exchange → `dlq.<domain>`. Retry: 3 attempts, backoff 1s/5s/25s, manual ack.
Routing per plan §8.

## Auth Flow

Access token (15m, `Authorization` header) + refresh token (7d, httpOnly cookie + DB row,
rotated on refresh). Gateway verifies access token and injects identity headers.

## Cross-Cutting Conventions

- All async handlers wrapped in `asyncHandler`; errors → shared `errorHandler`.
- Uniform response envelope `{ success, data, error }`.
- Each service validates env at boot (fail fast).
- Repositories own all Sequelize queries; services contain business logic only.
- Cursor pagination for feeds/messages; offset elsewhere.

## Out of Scope (for now)

- Real OAuth provider integration beyond callback handlers (stubbed verification).
- WebSocket gateway for realtime messaging (REST + Redis presence first).
- Email provider beyond SMTP transport wiring.
