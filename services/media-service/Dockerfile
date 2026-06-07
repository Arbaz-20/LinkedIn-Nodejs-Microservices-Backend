# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/media-service ./services/media-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/media-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/media-service/package.json ./services/media-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/media-service/dist ./services/media-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/media-service` against the DB.
COPY services/media-service/.sequelizerc ./services/media-service/
COPY services/media-service/config ./services/media-service/config
COPY services/media-service/migrations ./services/media-service/migrations
EXPOSE 3008
CMD ["node", "services/media-service/dist/server.js"]
