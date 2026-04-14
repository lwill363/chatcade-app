# -------- BUILD STAGE --------
FROM amazonlinux:2023 AS builder

ARG DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL

# Install system dependencies
RUN curl -sL https://rpm.nodesource.com/setup_24.x | bash - && \
    yum install -y nodejs python3 make gcc-c++ zip && \
    npm install -g yarn && \
    corepack enable

WORKDIR /app

# Copy dependency files first — cached until these change
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# Copy prisma schema separately — cached until schema changes
COPY prisma ./prisma
COPY prisma.config.ts .
RUN yarn prisma generate

# Copy source last — most frequently changing
COPY src ./src