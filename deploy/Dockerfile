# syntax=docker/dockerfile:1.7

FROM node:24.15.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3333 \
  LOG_LEVEL=info \
  APP_KEY=build-only-placeholder-key \
  APP_URL=http://localhost:3333 \
  SESSION_DRIVER=memory
RUN pnpm codegen \
  && pnpm --filter @asa/backend build
ENV VITE_API_URL=/api/v1
RUN pnpm --filter @asa/frontend build

FROM build AS backend-dependencies
RUN pnpm deploy --legacy --filter=@asa/backend --prod /out/backend

FROM node:24.15.0-bookworm-slim AS backend
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV LOG_LEVEL=info
ENV SESSION_DRIVER=memory
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/backend/build/ /app/
COPY --from=backend-dependencies --chown=node:node /out/backend/node_modules/ /app/node_modules/
RUN mkdir -p /app/tmp && chown node:node /app/tmp
COPY --chown=node:node deploy/docker-entrypoint.mjs /app/docker-entrypoint.mjs
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3333/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
ENTRYPOINT ["node", "docker-entrypoint.mjs"]

FROM nginx:1.29-alpine AS frontend
COPY --from=build /workspace/apps/frontend/dist/ /usr/share/nginx/html/
COPY deploy/runtime-config.js.template /etc/nginx/templates/runtime-config.js.template
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
