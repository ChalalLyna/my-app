# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances d'abord (cache Docker optimisé)
COPY package.json package-lock.json* ./
RUN npm install

# Code source
COPY . .

# Build Next.js
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Python3, PyYAML et git — nécessaires pour les scripts d'import CTI
RUN apk add --no-cache python3 py3-yaml git

# Fichiers nécessaires au runtime
COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next            ./.next
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package.json     ./package.json
COPY --from=builder /app/scripts          ./scripts

EXPOSE 3000

CMD ["npm", "start"]