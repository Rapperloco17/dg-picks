#!/bin/bash

# Script de inicio para Railway - configura SSL para PostgreSQL

# Si DATABASE_URL contiene railway, agregamos sslmode=require
if [[ "$DATABASE_URL" == *"railway"* ]] || [[ "$DATABASE_URL" == *"rlwy.net"* ]]; then
  echo "Configurando SSL para Railway PostgreSQL..."
  
  # Agregar sslmode=require a la URL si no lo tiene
  if [[ "$DATABASE_URL" != *"sslmode="* ]]; then
    if [[ "$DATABASE_URL" == *"?"* ]]; then
      export DATABASE_URL="${DATABASE_URL}&sslmode=require"
    else
      export DATABASE_URL="${DATABASE_URL}?sslmode=require"
    fi
  fi
  
  echo "DATABASE_URL configurada con SSL"
fi

# Ejecutar migraciones de Prisma si es necesario
# npx prisma migrate deploy

# Iniciar la aplicación
exec next start -p ${PORT:-3000}
