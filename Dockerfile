# 1. On part d'un environnement Node.js léger
FROM node:20-alpine

# 2. On définit le dossier de travail dans le conteneur
WORKDIR /app

# 3. On copie d'abord les fichiers qui listent tes dépendances
COPY package.json package-lock.json* ./

# 4. On installe les dépendances
RUN npm install

# 5. On copie tout le reste de ton code
COPY . .

# 6. La commande pour lancer le mode développement de Next.js
CMD ["npm", "run", "dev"]