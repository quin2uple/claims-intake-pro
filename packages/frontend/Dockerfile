FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm serve

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy frontend package files
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source (will be overridden by volume in dev)
COPY packages/frontend ./packages/frontend

WORKDIR /app/packages/frontend

# Expose port
EXPOSE 3000

# Start script that checks for dev mode
CMD sh -c "if [ -f vite.config.ts ]; then pnpm dev --host 0.0.0.0; else serve -s dist -p 3000 --no-clipboard; fi"
