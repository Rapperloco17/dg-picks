# 💵 DG Picks en Railway - Plan Económico ($5-12/mes)

Guía para correr DG Picks en Railway gastando lo mínimo posible pero funcionando al 100%.

## 🎯 Opciones según tu presupuesto

### Opción 1: **$5/mes** (Mínimo)
```
✅ Next.js App - 512MB RAM
✅ PostgreSQL - 1GB RAM, 1GB storage
⚠️ La app "duerme" después de 5 min sin uso
💡 Solución: Ping cada 5 min con UptimeRobot (gratis)
```

### Opción 2: **$10/mes** (Recomendada) ⭐
```
✅ Next.js App - 1GB RAM (no se duerme)
✅ PostgreSQL - 1GB RAM, 5GB storage
✅ Performance óptima
✅ 27k partidos caben perfecto
```

### Opción 3: **$20/mes** (Premium)
```
✅ Todo lo anterior x2
✅ Worker dedicado
✅ Backups automáticos
✅ Carga ultra rápida
```

---

## 🚀 Setup para $10/mes (Recomendado)

### 1. Crear PostgreSQL (gratis en Railway)

Railway da PostgreSQL **gratis** con 1GB storage en el tier Starter.

```bash
# En Railway dashboard:
New → Database → Add PostgreSQL
# Esperar 1 minuto a que se cree
# Ir a "Connect" y copiar DATABASE_URL
```

### 2. Configurar App Web ($5)

```bash
# Variables de entorno en Railway:
DATABASE_URL=postgresql://... (de tu PostgreSQL)
NEXT_PUBLIC_API_FOOTBALL_KEY=tu_api_key
CRON_SECRET=un_password_seguro_random
NODE_ENV=production
```

### 3. Configurar Cron Job Gratuito

Como no queremos pagar por el Worker, usamos **cron-job.org** (gratis):

1. Ve a https://cron-job.org
2. Crea cuenta gratuita
3. Nuevo cron job:
   - **Title**: "DG Picks Daily Sync"
   - **URL**: `https://tu-app.railway.app/api/cron?token=TU_CRON_SECRET`
   - **Schedule**: Cada día a las 06:00 UTC
   - **Notifications**: Tu email

¡Listo! Se sincroniza solo todos los días **sin costo extra**.

### 4. Evitar que la app "duerma"

Con $5 la app se duerme después de inactividad. Solución gratuita:

1. Ve a https://uptimerobot.com
2. Crea cuenta gratuita
3. Agrega monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://tu-app.railway.app`
   - **Interval**: Cada 5 minutos

Esto mantiene la app despierta 24/7 sin costo.

---

## 📊 ¿Qué incluye cada plan?

| Característica | $5/mes | $10/mes | $20/mes |
|----------------|--------|---------|---------|
| **App Web** | 512MB RAM | 1GB RAM | 2GB RAM |
| **PostgreSQL** | 1GB / 1GB | 1GB / 5GB | 2GB / 10GB |
| **Se duerme?** | Sí* | No | No |
| **Sincronización** | Cron externo gratis | Cron externo gratis | Worker dedicado |
| **Performance** | Buena | Excelente | Premium |
| **Partidos** | 50k+ | 100k+ | Ilimitado |

*Se soluciona con UptimeRobot gratis

---

## 💡 Tips para ahorrar

### 1. Usar Vercel para el frontend (GRATIS)

En lugar de Railway para la app web, usa **Vercel**:

```
┌─────────────────────────────────────┐
│  VERCEL (GRATIS)                    │
│  • Next.js app - Ilimitado          │
│  • CDN global                       │
│  • SSL automático                   │
└──────────────┬──────────────────────┘
               │
               ▼ API calls
┌─────────────────────────────────────┐
│  RAILWAY ($5/mes)                   │
│  • PostgreSQL (datos)               │
│  • API endpoints /api/*             │
│  • Cron jobs                        │
└─────────────────────────────────────┘
```

**Costo total: $5/mes** (solo PostgreSQL en Railway)

### 2. Optimizar PostgreSQL

```sql
-- Limpiar logs viejos periódicamente
DELETE FROM "SyncLog" WHERE "startedAt" < NOW() - INTERVAL '30 days';

-- Mantener solo últimos 10 modelos
DELETE FROM "ModelStats" WHERE id NOT IN (
  SELECT id FROM "ModelStats" ORDER BY "trainedAt" DESC LIMIT 10
);
```

### 3. Comprimir datos

Los partidos en JSON son grandes. En PostgreSQL ya están optimizados, pero puedes:
- Borrar partidos de hace más de 3 años
- Guardar solo ligas principales

---

## 🛠️ Deploy paso a paso (Plan $10)

### Paso 1: Subir código
```bash
git add .
git commit -m "Railway setup"
git push origin main
```

### Paso 2: Crear proyecto en Railway
1. Railway dashboard → New → Project
2. Deploy from GitHub repo → Selecciona dg-picks
3. Esperar build (~3 minutos)

### Paso 3: Agregar PostgreSQL
1. New → Database → Add PostgreSQL
2. Esperar 1 minuto
3. En Variables de tu app, agregar:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   (Railway lo hace automático si conectas los servicios)

### Paso 4: Configurar variables
```
NEXT_PUBLIC_API_FOOTBALL_KEY=tu_key_aqui
CRON_SECRET=password_random_seguro_de_30_chars
NODE_ENV=production
```

### Paso 5: Seed inicial
```bash
# En Railway dashboard, click en tu app → Shell
npm run db:seed
```

### Paso 6: Configurar cron externo
1. Ir a https://cron-job.org
2. Crear job:
   - URL: `https://tu-app.railway.app/api/cron?token=TU_CRON_SECRET`
   - Schedule: Daily at 06:00 UTC

### Paso 7: Configurar UptimeRobot (solo si usas $5)
1. Ir a https://uptimerobot.com
2. Agregar monitor HTTP(s)
3. URL: `https://tu-app.railway.app`
4. Interval: 5 minutes

---

## 📈 Monitoreo de costos

Railway cobra por uso. Para controlar:

```bash
# Ver uso actual
railway usage

# Limitar para no pasarte de $10
# En Railway dashboard → Settings → Usage Limits → $10
```

---

## 🆘 Si te pasas de presupuesto

### Opción A: Cambiar a Render (más barato)
Render tiene tier gratuito que no se duerme.

### Opción B: Usar Supabase (PostgreSQL gratis)
Supabase da 500MB gratis para siempre.

### Opción C: Vercel + PlanetScale
- Vercel: Frontend gratis
- PlanetScale: MySQL gratis (5GB)

---

## ✅ Checklist final

- [ ] App desplegada en Railway
- [ ] PostgreSQL conectado
- [ ] Variables de entorno configuradas
- [ ] Datos iniciales cargados (seed)
- [ ] Cron job configurado (cron-job.org)
- [ ] UptimeRobot configurado (si usas $5)
- [ ] Probado: `/api/sync/status` responde
- [ ] Probado: Predicciones funcionan

---

**Resumen**: Con **$10/mes** tienes DG Picks funcionando 24/7 perfecto. Con **$5/mes** también funciona pero necesitas UptimeRobot gratis para que no se duerma.

¿Te animas al de $10? Es el sweet spot calidad/precio 🎯
