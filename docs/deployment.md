# Deployment & CI/CD

## Container images

Every service ships a **two-stage Dockerfile** that builds the shared package first, then the
service, then assembles a slim runtime image:

```dockerfile
# Stage 1 — build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/<name>-service ./services/<name>-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/<name>-service

# Stage 2 — production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/<name>-service/package.json ./services/<name>-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/<name>-service/dist ./services/<name>-service/dist
# Postgres services also copy migration assets so migrations can run in-container:
COPY services/<name>-service/.sequelizerc ./services/<name>-service/
COPY services/<name>-service/config       ./services/<name>-service/config
COPY services/<name>-service/migrations   ./services/<name>-service/migrations
EXPOSE 300X
CMD ["node", "services/<name>-service/dist/server.js"]
```

The Docker build context is the **repo root** (so the build can see both `packages/shared` and the
service), with `-f services/<name>/Dockerfile`.

## Compose files

| File | Purpose |
|------|---------|
| [`infra/docker-compose.yml`](../infra/docker-compose.yml) | Full local stack: NGINX, Postgres, RabbitMQ, Redis, Elasticsearch, MinIO + all 10 services (built from source). |
| [`infra/docker-compose.prod.yml`](../infra/docker-compose.prod.yml) | Production overrides — pull prebuilt images (`IMAGE_PREFIX`/`IMAGE_TAG`) instead of building from source. |
| [`infra/init-databases.sql`](../infra/init-databases.sql) | Creates one Postgres database per service on first boot. |
| [`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf) | Edge reverse proxy: `/api/auth/*` → auth-service, everything else → api-gateway. |

Infra services declare healthchecks; application services `depends_on` them with
`condition: service_healthy`, so they start only once Postgres/RabbitMQ/Redis are ready.

### Running

```bash
# Local — build everything from source
docker compose -f infra/docker-compose.yml up -d

# Production — pull prebuilt images
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d
```

Service URLs/ports match the table in the [root README](../README.md#services). Public traffic
enters on port **80** (NGINX).

## Environment & secrets

All secrets are injected via environment variables (see [`.env.example`](../.env.example)). In
compose, each service's `DATABASE_URL` / `RABBITMQ_URL` / `REDIS_URL` are composed from
`POSTGRES_PASSWORD` / `RABBITMQ_PASSWORD` / `REDIS_PASSWORD`. Never bake secrets into images —
provide them through the environment (CI secrets, `.env`, or your orchestrator's secret store).

## CI — `.github/workflows/ci.yml`

Triggered on push and PRs to `main` / `develop`.

**Job: `lint-and-test`** (with Postgres + Redis service containers)
1. `npm ci`
2. `npm run build:shared`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test` (with `DATABASE_URL` / `REDIS_URL` pointed at the service containers)
6. Upload coverage to Codecov

**Job: `detect-changes`** — uses `dorny/paths-filter` to compute which services changed (a change
to `packages/shared/**` marks every service changed).

**Job: `build-and-push`** (only on `main`) — matrix over changed services; logs into GHCR, sets up
Buildx, and builds/pushes `:latest` and `:<sha>` tags with GitHub Actions layer caching.

> Current caveat: there are no tests or lint configs yet, so steps 3 and 5 pass vacuously. See
> [development.md](development.md#known-gaps).

## Deploy — `.github/workflows/deploy.yml`

Triggered by a **successful CI run on `main`** (`workflow_run`).

1. SSH into the deploy host (`appleboy/ssh-action`).
2. `git pull origin main`.
3. `docker compose ... pull` the latest images.
4. **Rolling update** — iterate services one at a time, `up -d --no-deps --build <svc>` with a
   short health-check pause between each.
5. `docker image prune -f`.

Required repository secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (and `CODECOV_TOKEN`
for CI coverage upload).

## Operational endpoints

- Health: `GET /health` on each service, and at the NGINX edge.
- RabbitMQ management UI: port **15672**.
- MinIO console: port **9001**.
- Elasticsearch: port **9200**.
