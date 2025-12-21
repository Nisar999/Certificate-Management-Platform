# Multi-stage build for production-optimized container image

# Client build stage with optimizations
FROM node:18-alpine AS client-builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory for client build
WORKDIR /app/client

# Copy client package files first for better caching
COPY client/package*.json ./

# Install client dependencies with optimizations
RUN npm ci --only=production --silent --no-audit --no-fund && \
    npm cache clean --force

# Copy client source code
COPY client/ ./

# Build client application with optimizations
RUN npm run build && \
    # Remove source maps and unnecessary files for production
    find build -name "*.map" -delete && \
    # Compress static assets
    find build -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;

# Server build stage with optimizations
FROM node:18-alpine AS server-builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory for server
WORKDIR /app/server

# Copy server package files first for better caching
COPY server/package*.json ./

# Install server dependencies with optimizations
RUN npm ci --only=production --silent --no-audit --no-fund && \
    npm cache clean --force

# Production runtime stage
FROM node:18-alpine AS runtime

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    tini \
    curl \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create app user for security with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy server dependencies and code with proper ownership
COPY --from=server-builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --chown=nodejs:nodejs server/ ./server/

# Copy built client files to server's public directory
COPY --from=client-builder --chown=nodejs:nodejs /app/client/build ./server/public

# Create necessary directories with proper permissions
RUN mkdir -p ./server/uploads ./server/logs ./server/temp && \
    chown -R nodejs:nodejs ./server/uploads ./server/logs ./server/temp && \
    chmod 755 ./server/uploads ./server/logs ./server/temp

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Set production environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=5000

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Add labels for better container management
LABEL maintainer="Certificate Management Platform Team" \
      version="2.0.0" \
      description="Certificate Management Platform with AWS integration" \
      org.opencontainers.image.source="https://github.com/your-username/certificate-management-platform"

# Use tini as init system for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Start the application with optimized Node.js flags
CMD ["node", "--max-old-space-size=1024", "--optimize-for-size", "server/index.js"]