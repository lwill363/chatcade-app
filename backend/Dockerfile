# -------- BUILD STAGE --------
FROM amazonlinux:2023 AS builder

# Provide dummy value ONLY for build
ARG DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL

# Install dependencies needed for native builds
RUN curl -sL https://rpm.nodesource.com/setup_22.x | bash - && \
    yum install -y nodejs python3 make gcc-c++ zip && \
    npm install -g yarn
RUN corepack enable

# Set workdir and copy code
WORKDIR /app
COPY package.json .
COPY yarn.lock .
COPY .yarnrc.yml .
RUN yarn install

COPY src ./src
COPY prisma ./prisma
COPY prisma.config.ts .

RUN yarn prisma generate
