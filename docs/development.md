# Development Guide

## Prerequisites

- Node.js ≥ 20
- npm (workspaces — no pnpm/yarn needed)
- Docker + Docker Compose (for Postgres, RabbitMQ, Redis, Elasticsearch, MinIO)

## First-time setup

```bash
npm install                 # install all workspaces
cp .env.example .env        # create local env; edit secrets
npm run infra:up            # start backing infra containers
npm run build:shared        # compile @linkedin-clone/shared
npm run db:migrate          # migrate every Postgres service
npm run dev                 # watch shared + run all services
```

## How `npm run dev` works

[`scripts/dev.js`](../scripts/dev.js):

1. starts `npm run dev -w @linkedin-clone/shared` (TypeScript in `--watch`), then
2. scans `services/`, and for every service with a `dev` script starts it concurrently with a
   colored prefix. Each service runs `tsx watch src/server.ts` for hot reload.

Because services are discovered dynamically, adding a new service makes it part of `npm run dev`
automatically.

## npm scripts

### Root

| Script | Description |
|--------|-------------|
| `dev` | Watch shared + run all services |
| `build` / `build:shared` | Build all workspaces / just shared |
| `typecheck` | `tsc --noEmit` across workspaces |
| `lint` | Lint across workspaces (`--if-present`) |
| `test` | Test across workspaces (`--if-present`) |
| `db:migrate` / `db:seed` | Run migrations / seeders across services |
| `infra:up` | Start only Postgres/RabbitMQ/Redis/Elasticsearch/MinIO |
| `docker:up` / `docker:down` / `docker:logs` / `docker:build` | Manage the full Docker stack |

### Per-service (use `-w <workspace>`)

| Script | Description |
|--------|-------------|
| `dev` | `tsx watch src/server.ts` |
| `build` | `tsc -p tsconfig.json` |
| `start` | `node dist/server.js` |
| `typecheck` | `tsc --noEmit` |
| `db:migrate` / `db:migrate:undo` / `db:seed` | sequelize-cli wrappers |
| `clean` | remove `dist/` |

```bash
npm run dev   -w @linkedin-clone/auth-service
npm run build -w @linkedin-clone/post-service
npm run db:migrate -w @linkedin-clone/user-service
```

## Migrations

Schema changes are **always** migrations — never model auto-sync.

```bash
# Generate a migration after editing a model
npx sequelize-cli migration:generate --name add_xyz \
  --options-path services/<svc>/.sequelizerc

# Apply / roll back
npm run db:migrate      -w @linkedin-clone/<svc>
npm run db:migrate:undo -w @linkedin-clone/<svc>
```

Each Postgres service has its own `migrations/` history and a `config/config.js` datasource that
reads `DATABASE_URL` (and enables TLS in production via `DB_SSL` / `DB_SSL_NO_VERIFY`).
search-service has no migrations — its Elasticsearch indices are asserted at boot.

## Conventions

- **Layering:** `routes → controllers → services → repositories → models`. Sequelize queries live
  **only** in repositories.
- **Validation:** zod schemas in `validators/`, applied with the shared `validate` middleware.
- **Errors:** throw `AppError` subclasses; the shared `errorHandler` serializes them.
- **Responses:** use `ok()` / `created()` / `noContent()` envelopes from `@linkedin-clone/shared`.
- **Identity:** read `req.userId` / `req.userRole` (populated by `requireUser` from gateway
  headers). Never parse JWTs inside a service.
- **Async work:** publish events rather than calling other services synchronously, unless the data
  is required within the request (the feed is the only current exception).
- **Config:** parse and validate env with zod in `config/index.ts`; fail fast.

## Adding a new service

1. Copy an existing service folder (e.g. `connection-service`) as a template.
2. Rename the package to `@linkedin-clone/<name>-service`, set its `PORT`.
3. Define models + migrations; wire associations in `models/index.ts`.
4. Build out `repositories → services → controllers → routes` and zod `validators`.
5. Add publishers/consumers in `events/` if it participates in the event flow
   (register exchange/queue names in `packages/shared/src/constants`).
6. Add a database to [`infra/init-databases.sql`](../infra/init-databases.sql) and a service block
   to [`infra/docker-compose.yml`](../infra/docker-compose.yml).
7. Add a gateway route in `services/api-gateway/src/routes/proxy.ts` and an NGINX upstream.
8. Add the service to the CI `paths-filter` in `.github/workflows/ci.yml`.

`npm run dev` will pick it up automatically.

## Adding an endpoint to an existing service

1. Add a zod schema in `validators/`.
2. Add a repository method (DB access).
3. Add the business logic in `services/` (publish an event if other services care).
4. Add a controller handler returning an envelope.
5. Register the route in `routes/` with `validate(...)` and `requireUser`.

## Known gaps

These are tracked, not yet done:

1. **Tests.** No `*.test.ts` files exist and no service defines a `test` script, so the CI `npm
   test` step is currently a no-op. Recommended first step: add a test runner (e.g. Vitest) +
   per-service `test` scripts, starting with auth and post (feed keyset logic).
2. **Lint config.** No ESLint/Prettier config or `lint` scripts; CI's `lint` passes vacuously. Add
   a shared ESLint config at the root and a `lint` script per workspace.
3. **Media workers.** media-service publishes `media.resize` / `media.thumbnail` but nothing
   consumes them. Build `services/media-service/src/events/consumers.ts` to process images (e.g.
   with `sharp`), write the output to MinIO, and flip the media row from `PROCESSING` to `READY`.

**Suggested order:** media workers (closes a real functional gap) → lint config (cheap, improves
every change) → tests (largest effort, highest long-term value).
