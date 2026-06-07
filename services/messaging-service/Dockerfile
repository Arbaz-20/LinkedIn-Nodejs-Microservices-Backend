# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/messaging-service ./services/messaging-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/messaging-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/messaging-service/package.json ./services/messaging-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/messaging-service/dist ./services/messaging-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/messaging-service` against the DB.
COPY services/messaging-service/.sequelizerc ./services/messaging-service/
COPY services/messaging-service/config ./services/messaging-service/config
COPY services/messaging-service/migrations ./services/messaging-service/migrations
EXPOSE 3005
CMD ["node", "services/messaging-service/dist/server.js"]
