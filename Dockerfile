FROM node:20-alpine AS base

# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache openssl

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias de producción
RUN npm ci --only=production

# Generar Prisma client
RUN npx prisma generate

# Copiar el resto del código
COPY . .

# Variables de entorno para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build de Next.js
RUN npm run build

# ===========================================
# Production stage
# ===========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar solo openssl (necesario para Prisma)
RUN apk add --no-cache openssl

# Variables de entorno
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copiar archivos necesarios desde el stage de build
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Puerto expuesto
EXPOSE 3000

# Comando para iniciar (modo standalone)
CMD ["node", "server.js"]
