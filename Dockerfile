# Multi-stage Dockerfile for Shopify SEO Analyzer

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install production dependencies
RUN npm ci --only=production

# Copy production node_modules aside
RUN cp -R node_modules prod_node_modules

# Install all dependencies (including devDependencies)
RUN npm ci

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci

# Stage 2: Build
FROM node:18-alpine AS build

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules

# Copy source code
COPY . .

# Build backend
WORKDIR /app/backend
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/prod_node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/frontend/build ./public

# Copy necessary files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs backend/package*.json ./backend/
COPY --chown=nodejs:nodejs database ./database
COPY --chown=nodejs:nodejs scripts ./scripts

# Create necessary directories
RUN mkdir -p logs uploads temp cache && \
    chown -R nodejs:nodejs logs uploads temp cache

# Set timezone
ENV TZ=UTC

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node scripts/healthcheck.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "dist/server.js"]

# Stage 4: Development
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    bash

WORKDIR /app

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads temp cache

# Expose ports
EXPOSE 3000 3001 9229

# Development command with hot reload and debugging
CMD ["npm", "run", "dev"]

# Stage 5: Testing
FROM node:18-alpine AS testing

# Install test dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    firefox-esr

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy everything including test files
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules
COPY . .

# Run tests
CMD ["npm", "test"]

# Stage 6: Worker
FROM production AS worker

# Override command for worker process
CMD ["node", "dist/worker.js"]

# Stage 7: Scheduler
FROM production AS scheduler

# Install cron
USER root
RUN apk add --no-cache dcron

# Copy crontab
COPY --chown=nodejs:nodejs scripts/crontab /etc/crontabs/nodejs

# Create startup script
RUN echo '#!/bin/sh' > /start-scheduler.sh && \
    echo 'crond -f -l 8 &' >> /start-scheduler.sh && \
    echo 'exec node dist/scheduler.js' >> /start-scheduler.sh && \
    chmod +x /start-scheduler.sh

USER nodejs

# Override command for scheduler
CMD ["/start-scheduler.sh"]

# Backup service Dockerfile (Dockerfile.backup)
FROM alpine:latest AS backup

# Install PostgreSQL client and AWS CLI
RUN apk add --no-cache \
    postgresql-client \
    aws-cli \
    bash \
    gzip \
    coreutils

# Install supercronic for cron jobs
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.24/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=6817299e04457e5d6ec4809c72ee13a43e95ba41

RUN curl -fsSLO "$SUPERCRONIC_URL" \
    && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
    && chmod +x "$SUPERCRONIC" \
    && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
    && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

# Create backup user
RUN addgroup -g 1001 -S backup && \
    adduser -S backup -u 1001 -G backup

# Create backup directory
RUN mkdir -p /backups && chown backup:backup /backups

# Copy backup script
COPY --chown=backup:backup scripts/backup.sh /scripts/backup.sh
RUN chmod +x /scripts/backup.sh

# Copy crontab
COPY --chown=backup:backup scripts/backup-cron /etc/crontabs/backup

USER backup

# Run supercronic
CMD ["supercronic", "/etc/crontabs/backup"]