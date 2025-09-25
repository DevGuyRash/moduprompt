# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.17.0
ARG PNPM_VERSION=9.7.0

FROM node:${NODE_VERSION}-alpine AS base
LABEL org.opencontainers.image.source="https://example.com/moduprompt" \
      org.opencontainers.image.description="ModuPrompt monorepo build stage" \
      org.opencontainers.image.licenses="MIT"
RUN corepack disable \
 && npm install -g pnpm@${PNPM_VERSION}
WORKDIR /srv/moduprompt

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY tests ./tests
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm build
ENV NODE_OPTIONS=--loader=ts-node/esm
RUN pnpm --filter @moduprompt/types run schema
ENV NODE_OPTIONS=
RUN pnpm --filter @moduprompt/api prisma:generate

FROM build AS deploy
RUN pnpm --filter @moduprompt/api --prod deploy /srv/deploy

FROM node:${NODE_VERSION}-alpine AS runtime-base
RUN addgroup -S moduprompt -g 10001 \
 && adduser -S moduprompt -G moduprompt -u 10001
WORKDIR /srv/moduprompt
ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_ROOT=/srv/moduprompt/apps/web/dist \
    PATH=/usr/local/bin:$PATH
COPY --from=deploy /srv/deploy/node_modules ./node_modules
COPY --from=build /srv/moduprompt/node_modules/.modules.yaml ./node_modules/.modules.yaml
COPY --from=build /srv/moduprompt/apps/api/dist ./apps/api/dist
RUN printf "import './apps/api/src/index.js';\n" > ./apps/api/dist/index.js
COPY --from=build /srv/moduprompt/apps/api/prisma ./apps/api/prisma
COPY --from=build /srv/moduprompt/apps/web/dist ./apps/web/dist
COPY --from=build /srv/moduprompt/packages ./packages
COPY --from=build /srv/moduprompt/apps/api/package.json ./apps/api/package.json
COPY package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN chown -R moduprompt:moduprompt /srv/moduprompt
RUN --mount=type=bind,from=build,source=/srv/moduprompt/node_modules/.pnpm,target=/tmp/build-pnpm \
  for dir in /tmp/build-pnpm/@prisma+client@*/; do \
    [ -d "$dir" ] || continue; \
    pkg="$(basename "$dir")"; \
    rm -rf "./node_modules/.pnpm/$pkg"; \
    cp -R "$dir" "./node_modules/.pnpm/$pkg"; \
  done
RUN for pkg in compiler snippet-store types; do \
      if [ -d "./packages/${pkg}/dist" ] && [ -d "./node_modules/@moduprompt/${pkg}" ]; then \
        rm -rf "./node_modules/@moduprompt/${pkg}/dist" && \
        cp -R "./packages/${pkg}/dist" "./node_modules/@moduprompt/${pkg}/dist"; \
      fi; \
    done
USER moduprompt
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD \
  node -e "const http=require('http');const opts={host:'127.0.0.1',port:process.env.PORT||8080,path:'/healthz',timeout:4000};const req=http.get(opts,res=>{process.exit(res.statusCode===200?0:1);});req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

FROM runtime-base AS exporter
ENTRYPOINT ["node","--enable-source-maps","apps/api/dist/index.js"]

FROM runtime-base AS runtime
ENTRYPOINT ["node","--enable-source-maps","apps/api/dist/index.js"]
CMD []
