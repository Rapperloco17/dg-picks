#!/bin/sh

echo "🔄 Checking database connection..."

# Intentar crear las tablas si no existen
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  DB push failed, continuing anyway..."

echo "🚀 Starting application..."
npm start
