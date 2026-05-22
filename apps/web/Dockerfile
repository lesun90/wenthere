# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
# Copy monorepo workspace config and lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: dev ─────────────────────────────────────────────────────────────
FROM base AS dev
EXPOSE 3000 9229
ENV NODE_ENV=development
ENV NODE_OPTIONS=--inspect=0.0.0.0:9229
CMD ["pnpm", "--filter", "@beenthere/web", "dev"]

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM base AS builder
RUN pnpm --filter @beenthere/web build

# ─── Stage 4: prod ────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy only the standalone output and static assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
