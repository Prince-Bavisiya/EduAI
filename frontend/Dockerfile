# ==============================================================================
# EduAI Frontend Production Dockerfile
# Multi-stage optimized Next.js 16 Alpine Image
# ==============================================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat wget

# -----------------
# 1. Dependencies Stage
# -----------------
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# -----------------
# 2. Builder Stage
# -----------------
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src

# Environment build argument
ARG NEXT_PUBLIC_API_URL="http://localhost:5000/api"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -----------------
# 3. Production Runner Stage
# -----------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "start"]
