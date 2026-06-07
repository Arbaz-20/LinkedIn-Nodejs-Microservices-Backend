# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/job-service ./services/job-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/job-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/job-service/package.json ./services/job-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/job-service/dist ./services/job-service/dist
# Migration assets — run `npm run db:migrate -w @linkedin-clone/job-service` against the DB.
COPY services/job-service/.sequelizerc ./services/job-service/
COPY services/job-service/config ./services/job-service/config
COPY services/job-service/migrations ./services/job-service/migrations
EXPOSE 3009
CMD ["node", "services/job-service/dist/server.js"]
