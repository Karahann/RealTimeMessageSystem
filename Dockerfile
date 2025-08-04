# Multi-stage build for production optimization
FROM node:18 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Development stage
FROM node:18 AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command for development
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18 AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command for production
CMD ["npm", "start"]
