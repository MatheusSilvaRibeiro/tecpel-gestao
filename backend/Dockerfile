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

FROM base AS development
ENV NODE_ENV=development
EXPOSE 3333
CMD ["pnpm", "--filter", "@tecpel/backend", "dev"]

FROM base AS build
RUN pnpm --filter @tecpel/backend prisma:generate
RUN pnpm --filter @tecpel/backend build

FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV PORT=3333
WORKDIR /app
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./node_modules
EXPOSE 3333
CMD ["node", "dist/server.js"]
