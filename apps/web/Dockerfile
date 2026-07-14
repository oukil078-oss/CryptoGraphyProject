# Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependency Installer
FROM base AS dependencies
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/rsa-engine/package*.json ./packages/rsa-engine/
COPY packages/paillier-engine/package*.json ./packages/paillier-engine/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Builder Stage
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN npx nx run @cryptolab/shared-types:build || true
RUN npx nx run @cryptolab/rsa-engine:build || true
RUN npx nx run @cryptolab/paillier-engine:build || true
RUN npx nx run @cryptolab/web:build || true

# Production Runner
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app ./

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["npx", "nx", "run", "@cryptolab/web:start"]
