# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: dev ─────────────────────────────────────────────────────────────
FROM base AS dev
COPY . .
EXPOSE 3000 9229
ENV NODE_ENV=development
ENV NODE_OPTIONS=--inspect=0.0.0.0:9229
CMD ["pnpm", "dev"]

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN pnpm build

# ─── Stage 4: prod ────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy only the standalone output and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
