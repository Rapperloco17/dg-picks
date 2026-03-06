# 🚂 DG Picks - Deployment en Railway

Este documento explica cómo desplegar DG Picks en Railway con sincronización automática 24/7.

## 📋 Requisitos Previos

- Cuenta en [Railway](https://railway.app)
- Cuenta en [GitHub](https://github.com)
- API Key de [API-Football](https://www.api-football.com/)

## 🚀 Paso a Paso

### 1. Crear Base de Datos PostgreSQL en Railway

1. Ve a tu dashboard de Railway
2. Click en **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Espera a que se cree (toma ~1 minuto)
4. Ve a la pestaña **"Connect"** y copia la **"Database URL"**

### 2. Subir Código a GitHub

```bash
git init
git add .
git commit -m "Setup for Railway deployment"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/dg-picks.git
git push -u origin main
```

### 3. Crear Proyecto en Railway

1. En Railway, click en **"New"** → **"Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Conecta tu cuenta de GitHub y selecciona el repo `dg-picks`
4. Railway detectará automáticamente el `Dockerfile`

### 4. Configurar Variables de Entorno

En el proyecto de Railway, ve a **"Variables"** y agrega:

```
DATABASE_URL=postgresql://... (copia de PostgreSQL)
NEXT_PUBLIC_API_FOOTBALL_KEY=tu_api_key
CRON_SECRET=un_string_random_seguro
NODE_ENV=production
```

### 5. Conectar Base de Datos al Servicio

1. Ve a tu servicio de Next.js en Railway
2. Click en **"Settings"** → **"Service"** → **"Database"**
3. Selecciona tu PostgreSQL

### 6. Hacer Deploy

Railway hará deploy automáticamente. Espera ~3-5 minutos.

### 7. Ejecutar Seed (Cargar datos iniciales)

Una vez deployado, carga los datos iniciales:

```bash
# Instalar Railway CLI si no lo tienes
npm install -g @railway/cli

# Login
railway login

# Enlazar proyecto
railway link

# Ejecutar seed
railway run npm run db:seed
```

O desde el dashboard de Railway:
1. Ve a tu servicio
2. Click en **"Shell"**
3. Ejecuta: `npm run db:seed`

## 🔄 Configurar Worker de Sincronización

Para que se sincronice automáticamente sin tener tu compu prendida:

### Opción A: Cron Job Externo (Gratis)

Usa [cron-job.org](https://cron-job.org) o [UptimeRobot](https://uptimerobot.com):

1. Regístrate en cron-job.org
2. Crea un nuevo job:
   - **URL**: `https://tu-app.railway.app/api/sync`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer tu_cron_secret`
   - **Schedule**: Cada día a las 6:00 AM UTC

### Opción B: Worker en Railway (Mejor)

Crea un segundo servicio en Railway para el worker:

1. En tu proyecto de Railway, **"New"** → **"Empty Service"**
2. En **"Settings"** → **"Source"**, selecciona el mismo repo
3. En **"Start Command"**, pon:
   ```
   npx ts-node src/worker/cron.ts
   ```
4. Conecta la misma base de datos
5. Copia las mismas variables de entorno

## 📊 Monitorear Estado

Puedes verificar el estado de la sincronización:

```bash
curl https://tu-app.railway.app/api/sync/status
```

## 🔧 Comandos Útiles

### Ver logs
```bash
railway logs
```

### Acceder a la base de datos
```bash
railway connect postgres
```

### Forzar sync manual
```bash
curl -X POST https://tu-app.railway.app/api/sync \
  -H "Authorization: Bearer tu_cron_secret"
```

### Abrir Prisma Studio
```bash
railway run npx prisma studio
```

## 💰 Costos Estimados (Railway)

| Componente | Costo Mes |
|------------|-----------|
| Next.js App | ~$5-10 |
| PostgreSQL | ~$5-10 |
| Worker | ~$5 |
| **Total** | **~$15-25/mes** |

> 💡 Railway tiene $5 de crédito gratuito mensual

## 🆘 Troubleshooting

### Error "Prisma Client not found"
```bash
# Regenerar cliente
railway run npx prisma generate
```

### Error de conexión a base de datos
Verifica que `DATABASE_URL` esté correctamente configurada en las variables.

### Worker no inicia
Revisa los logs en Railway dashboard → tu servicio worker → Logs.

## 📁 Estructura Final en Railway

```
DG Picks Project
├── 🌐 dg-picks-web (Next.js)
│   └── Puerto: 3000
├── 🔄 dg-picks-worker (Cron)
│   └── Corre 24/7
└── 🐘 PostgreSQL
    └── Base de datos persistente
```

## ✅ Checklist Post-Deploy

- [ ] App web carga correctamente
- [ ] `/api/sync/status` devuelve datos
- [ ] Base de datos tiene partidos cargados
- [ ] Cron job está configurado
- [ ] Modelo ML se entrena automáticamente
- [ ] Predicciones funcionan en la web

---

¡Listo! Tu app ahora corre 24/7 en Railway 🎉
