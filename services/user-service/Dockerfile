# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/user-service ./services/user-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/user-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/user-service/package.json ./services/user-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/user-service/dist ./services/user-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/user-service` against the DB.
COPY services/user-service/.sequelizerc ./services/user-service/
COPY services/user-service/config ./services/user-service/config
COPY services/user-service/migrations ./services/user-service/migrations
EXPOSE 3002
CMD ["node", "services/user-service/dist/server.js"]
