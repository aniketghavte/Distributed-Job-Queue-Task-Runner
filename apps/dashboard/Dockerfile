# Build from repository root: docker build -f apps/dashboard/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
RUN npx turbo run build --filter=@repo/dashboard
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo /repo
WORKDIR /repo/apps/dashboard
EXPOSE 3000
ENV INTERNAL_API_URL=http://api:3001
ENV NEXT_PUBLIC_WS_URL=ws://localhost:3001/live
CMD ["npm", "run", "start"]
