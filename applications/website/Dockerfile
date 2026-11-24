FROM node:26-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 LEAD_DIR=/var/lib/raksent/leads
WORKDIR /app
# The site has no npm dependencies, so the bundled package managers are dead weight with their own CVEs.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
 && mkdir -p "$LEAD_DIR" && chown node:node "$LEAD_DIR" && chmod 0700 "$LEAD_DIR"
COPY pages.mjs services.mjs server.mjs ./
COPY public/ ./public/
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
