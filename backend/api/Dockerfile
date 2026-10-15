# ---- Étape 1 : on compile le code TypeScript ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Étape 2 : l'image finale, légère, qui tourne sur le serveur ----
FROM node:24-alpine
# Polices pour dessiner l'image « mes disponibilités » partagée sur les réseaux sociaux.
RUN apk add --no-cache font-dejavu fontconfig
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Les photos des prestataires sont gardées dans un volume Docker (/data/uploads).
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
