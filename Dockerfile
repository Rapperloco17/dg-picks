FROM node:20-alpine

WORKDIR /app

# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache openssl

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Generar Prisma client
RUN npx prisma generate

# Copiar el resto del código
COPY . .

# Variables de entorno
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build de Next.js
RUN npm run build

# Puerto
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
