# Using official Node.js image as base
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install global dependencies
RUN npm install -g pm2

# ===== Backend build stage =====
FROM base AS backend-build

# Copy backend dependency configuration files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src
COPY backend/config ./config
COPY backend/.env.production ./.env

# ===== Frontend build stage =====
FROM base AS frontend-build

# Copy frontend dependency configuration files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies (including dev dependencies for building)
WORKDIR /app/frontend
RUN npm ci

# Copy frontend source code
COPY frontend ./

# Build frontend
RUN npm run build

# ===== Final stage =====
FROM base

# Create directory structure
RUN mkdir -p /app/backend /app/frontend/build /app/logs /app/keys

# Copy backend
COPY --from=backend-build /app/backend /app/backend

# Copy frontend build artifacts
COPY --from=frontend-build /app/frontend/build /app/frontend/build

# Create PM2 configuration file
COPY ecosystem.config.js /app/

# Create necessary directories and files
RUN mkdir -p /app/backend/uploads \
    && touch /app/logs/app.log \
    && touch /app/logs/error.log

# Expose application port
EXPOSE 3000

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Container startup command
CMD ["pm2-runtime", "start", "ecosystem.config.js"] 