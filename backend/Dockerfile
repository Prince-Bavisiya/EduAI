# ==============================================================================
# EduAI Backend Production Dockerfile
# Multi-stage lightweight Node.js 20 Alpine Image
# ==============================================================================

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies required by Prisma engine
RUN apk add --no-cache openssl wget libc6-compat

# -----------------
# 1. Dependencies Stage
# -----------------
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# -----------------
# 2. Build & Generation Stage
# -----------------
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npx prisma generate

# -----------------
# 3. Production Runner Stage
# -----------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 eduai

# Copy installed modules and prisma runtime
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json server.js ./
COPY prisma ./prisma
COPY src ./src

# Set ownership
RUN chown -R eduai:nodejs /app
USER eduai

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

# Start script
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
