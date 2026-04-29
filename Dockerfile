# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances d'abord (cache Docker optimisé)
COPY package.json package-lock.json* ./
RUN npm install

# Code source
COPY . .

# Build Next.js
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Uniquement les fichiers nécessaires au runtime
COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next            ./.next
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package.json     ./package.json

EXPOSE 3000

CMD ["npm", "start"]