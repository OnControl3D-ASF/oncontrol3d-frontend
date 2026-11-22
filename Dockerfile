FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
# No NEXT_PUBLIC_API_URL on purpose: the bundle calls same-origin relative URLs (the edge routes them).
RUN npm run build

# Runtime: the standalone server only (traced production dependencies, no devDependencies, no npm).
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Next writes its image/data cache here; mount an emptyDir when the root filesystem is read-only.
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000

# Node is the only tool in the image (no curl/wget); any HTTP answer below 500 means the server is up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
