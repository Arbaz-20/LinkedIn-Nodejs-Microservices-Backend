# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/connection-service ./services/connection-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/connection-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/connection-service/package.json ./services/connection-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/connection-service/dist ./services/connection-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/connection-service` against the DB.
COPY services/connection-service/.sequelizerc ./services/connection-service/
COPY services/connection-service/config ./services/connection-service/config
COPY services/connection-service/migrations ./services/connection-service/migrations
EXPOSE 3003
CMD ["node", "services/connection-service/dist/server.js"]
