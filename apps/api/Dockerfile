# Build from repository root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
RUN npx turbo run build --filter=@repo/api
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
