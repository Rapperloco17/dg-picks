// Script para seleccionar el schema correcto según el entorno
const fs = require('fs');
const path = require('path');

const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.DATABASE_URL?.includes('railway');

const prismaDir = path.join(__dirname, '..', 'prisma');
const targetSchema = path.join(prismaDir, 'schema.prisma');

if (isRailway) {
  console.log('🏭 Railway detectado - Usando PostgreSQL schema');
  const railwaySchema = path.join(prismaDir, 'schema.railway.prisma');
  fs.copyFileSync(railwaySchema, targetSchema);
} else {
  console.log('💻 Entorno local detectado - Usando SQLite schema');
  // El schema local ya está configurado
}

console.log('✅ Schema configurado correctamente');
