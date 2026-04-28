# 1. Node léger
FROM node:20-alpine

# 2. dossier app
WORKDIR /app

# 3. dépendances
COPY package.json package-lock.json* ./
RUN npm install

# 4. code source
COPY . .

# 5. build Next.js (IMPORTANT)
RUN npm run build

# 6. port Next.js
EXPOSE 3000

# 7. lancement production
CMD ["npm", "start"]