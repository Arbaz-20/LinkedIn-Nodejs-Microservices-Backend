# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/post-service ./services/post-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/post-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/post-service/package.json ./services/post-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/post-service/dist ./services/post-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/post-service` against the DB.
COPY services/post-service/.sequelizerc ./services/post-service/
COPY services/post-service/config ./services/post-service/config
COPY services/post-service/migrations ./services/post-service/migrations
EXPOSE 3004
CMD ["node", "services/post-service/dist/server.js"]
