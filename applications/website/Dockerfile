FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 LEAD_DIR=/var/lib/raksent/leads
WORKDIR /app
RUN mkdir -p "$LEAD_DIR" && chown node:node "$LEAD_DIR" && chmod 0700 "$LEAD_DIR"
COPY pages.mjs server.mjs ./
COPY public/ ./public/
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
