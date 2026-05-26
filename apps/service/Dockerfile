# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy the monorepo workspace and only the app/packages needed by the service.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/service/ ./apps/service/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: dev ─────────────────────────────────────────────────────────────
FROM base AS dev
EXPOSE 3001 9230
ENV NODE_ENV=development
ENV NODE_OPTIONS=--inspect=0.0.0.0:9230
CMD ["pnpm", "--filter", "@beenthere/service", "dev"]

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM base AS builder
RUN pnpm --filter @beenthere/service build

# ─── Stage 4: prod ────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/service/.next/standalone ./
COPY --from=builder /app/apps/service/.next/static ./apps/service/.next/static

EXPOSE 3001
CMD ["node", "apps/service/server.js"]
