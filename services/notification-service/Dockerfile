# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/notification-service ./services/notification-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/notification-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification-service/package.json ./services/notification-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/notification-service/dist ./services/notification-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/notification-service` against the DB.
COPY services/notification-service/.sequelizerc ./services/notification-service/
COPY services/notification-service/config ./services/notification-service/config
COPY services/notification-service/migrations ./services/notification-service/migrations
EXPOSE 3006
CMD ["node", "services/notification-service/dist/server.js"]
