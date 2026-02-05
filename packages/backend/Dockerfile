FROM node:20-alpine

# Install OpenSSL and other required dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy backend package files
COPY packages/backend/package.json ./packages/backend/

# Copy Prisma schema BEFORE install (needed for postinstall)
COPY packages/backend/prisma ./packages/backend/prisma

# Install dependencies (postinstall will generate Prisma Client)
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build backend
WORKDIR /app/packages/backend
RUN pnpm build

# Expose port
EXPOSE 3001

# Start the application (run migrations first)
CMD ["sh", "-c", "pnpm db:migrate:deploy && pnpm start"]
