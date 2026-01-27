# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build TypeScript and client
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates \
    wget

# Create non-root user
RUN addgroup -g 1001 -S claudedesk && \
    adduser -S -u 1001 -G claudedesk claudedesk

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Create data directories with proper permissions
RUN mkdir -p /data/config /data/config/skills /data/config/usage /data/artifacts && \
    chown -R claudedesk:claudedesk /data /app

# Copy example configs to data directory
RUN cp config/*.example.json /data/config/ || true && \
    cp config/skills/*.md /data/config/skills/ || true && \
    chown -R claudedesk:claudedesk /data

# Switch to non-root user
USER claudedesk

# Set data directory as working directory
WORKDIR /data

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:8787/api/health || exit 1

# Start server
CMD ["node", "/app/dist/cli.js", "--data-dir", "/data"]
