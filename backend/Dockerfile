FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile
COPY backend backend
RUN pnpm --filter @tecpel/backend prisma:generate

FROM base AS development
ENV NODE_ENV=development
EXPOSE 3333
CMD ["pnpm", "--filter", "@tecpel/backend", "dev"]

FROM base AS build
RUN pnpm --filter @tecpel/backend build

FROM base AS migration
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@tecpel/backend", "prisma:deploy"]

FROM base AS production-dependencies
RUN pnpm --filter @tecpel/backend deploy --prod --legacy /prod/backend \
  && cd /prod/backend \
  && /app/backend/node_modules/.bin/prisma generate --schema=prisma/schema.prisma

FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV PORT=3333
WORKDIR /app/backend
COPY --from=production-dependencies --chown=node:node /prod/backend ./
COPY --from=build --chown=node:node /app/backend/dist ./dist
RUN mkdir -p /app/backend/uploads/products && chown -R node:node /app/backend/uploads
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3333/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
