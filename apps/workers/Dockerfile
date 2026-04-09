# Build from repository root: docker build -f apps/workers/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
RUN npx turbo run build --filter=@repo/workers
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo /repo
WORKDIR /repo/apps/workers
EXPOSE 9101
CMD ["node", "dist/emailWorker.js"]
