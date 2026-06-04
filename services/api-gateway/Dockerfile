# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/api-gateway ./services/api-gateway
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/api-gateway

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/api-gateway/dist ./services/api-gateway/dist
EXPOSE 3000
CMD ["node", "services/api-gateway/dist/server.js"]
