# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/auth-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/auth-service/dist ./services/auth-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/auth-service` against the DB.
COPY services/auth-service/.sequelizerc ./services/auth-service/
COPY services/auth-service/config ./services/auth-service/config
COPY services/auth-service/migrations ./services/auth-service/migrations
EXPOSE 3001
CMD ["node", "services/auth-service/dist/server.js"]
