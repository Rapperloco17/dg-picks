# 🚀 DG Picks - Plan Premium ($20/mes) en Railway

Configuración óptima para DG Picks con recursos dedicados y máximo rendimiento.

## 💎 Qué incluyen tus $20/mes

```
┌─────────────────────────────────────────────────────┐
│              RAILWAY PREMIUM ($20/mes)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🌐 WEB APP (Next.js)                               │
│     • 2GB RAM dedicados                             │
│     • 1 vCPU                                        │
│     • Nunca se duerme                               │
│     • SSL automático + CDN                          │
│     • $8-10/mes                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔄 WORKER (Cron Dedicado)                          │
│     • 1GB RAM                                       │
│     • 0.5 vCPU                                      │
│     • Corre 24/7                                    │
│     • Sincronización automática 6 AM UTC            │
│     • Re-entrena modelo automáticamente             │
│     • $5/mes                                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🐘 POSTGRESQL                                      │
│     • 2GB RAM                                       │
│     • 10GB SSD storage                              │
│     • Backups automáticos diarios                   │
│     • 100k+ partidos capacity                       │
│     • $5/mes                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🎯 Ventajas del plan Premium

| Característica | Starter ($5) | Premium ($20) |
|----------------|--------------|---------------|
| **RAM Total** | 1.5GB | 5GB |
| **Storage** | 1GB | 10GB |
| **Backups** | Manual | Automático diario |
| **Uptime** | 95% | 99.9% |
| **Sincronización** | Cron externo | Worker dedicado |
| **Tiempo de carga** | 2-3s | <1s |
| **Concurrent users** | 10 | 100+ |
| **Modelo ML** | Entrena en request | Entrena en background |

---

## 🚀 Deploy paso a paso

### Paso 1: Preparar código

```bash
# Asegúrate de tener todo commiteado
git add .
git commit -m "Railway Premium setup"
git push origin main
```

### Paso 2: Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. Click **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Busca y selecciona `dg-picks`

### Paso 3: Agregar PostgreSQL

```bash
# En Railway dashboard:
New → Database → Add PostgreSQL

# Esperar a que se cree (indicador verde)
# Luego ir a "Connect" y copiar DATABASE_URL
```

### Paso 4: Configurar servicio Web

1. Ve a tu servicio (el que se creó del Dockerfile)
2. Click en **"Settings"**
3. Cambiar a plan **Developer** ($8-10/mes)
4. En **Environment** agregar variables:

```env
# Database (Railway la pone automático si conectas)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# API Keys
NEXT_PUBLIC_API_FOOTBALL_KEY=tu_api_key_aqui

# Seguridad
CRON_SECRET=genera_un_password_random_de_50_caracteres_aqui
JWT_SECRET=otro_password_random_para_jwt

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-app.railway.app
```

### Paso 5: Crear servicio Worker

1. En tu proyecto de Railway, click **"New"** → **"Empty Service"**
2. Nombre: `dg-picks-worker`
3. Settings → Source → selecciona el mismo repo
4. En **Start Command** pon:
   ```bash
   npx ts-node src/worker/cron.ts
   ```
5. Cambiar a plan **Starter** ($5/mes)
6. Conectar misma base de datos (Variables → Add Reference → PostgreSQL)
7. Copiar las mismas variables de entorno del servicio web

### Paso 6: Conectar servicios

```
Project: DG Picks
├── 🌐 dg-picks-web (Next.js) ──┐
│   Puerto: 3000                │
│   Plan: Developer ($8-10)     │
└───────────────┬───────────────┘
                │
                ▼
        ┌───────────────┐
        │  PostgreSQL   │
        │  Plan: Starter│
        │  ($5/mes)     │
        └───────┬───────┘
                ▲
┌───────────────┴───────────────┐
│                               │
│  🔄 dg-picks-worker (Cron)    │
│  Plan: Starter ($5/mes)       │
│                               │
└───────────────────────────────┘
```

### Paso 7: Deploy inicial

1. Ve a tu servicio web → **"Deploy"**
2. Esperar a que termine (~5 minutos)
3. Ver logs: Debe decir "Ready on port 3000"

### Paso 8: Cargar datos iniciales

```bash
# En Railway dashboard:
# 1. Click en tu servicio web
# 2. Tab "Shell"
# 3. Ejecutar:

npm run db:seed

# Esto carga los ~27k partidos iniciales
# Toma ~3-5 minutos
```

### Paso 9: Entrenar modelo inicial

```bash
# En el mismo Shell:
npx ts-node scripts/train-initial-model.ts

# O llamar al endpoint:
curl -X POST https://tu-app.railway.app/api/sync \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

### Paso 10: Verificar todo

Abre en tu navegador:
- `https://tu-app.railway.app` → Debe cargar la app
- `https://tu-app.railway.app/api/sync/status` → Debe mostrar datos

---

## 📊 Monitoreo avanzado

### Dashboard de métricas

Railway tiene métricas en tiempo real:
- CPU usage
- RAM usage  
- Network I/O
- Requests/minuto

### Logs centralizados

```bash
# Ver logs de todos los servicios
railway logs --service dg-picks-web
railway logs --service dg-picks-worker
```

### Alertas (configurar en Railway)

Ve a Settings → Notifications:
- [ ] Deployment failed
- [ ] High CPU usage (>80%)
- [ ] High memory usage (>80%)
- [ ] Service crashed

---

## 🔄 Flujo automático (ya configurado)

```
┌────────────────────────────────────────────────────────────┐
│                    FLUJO DIARIO AUTOMÁTICO                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  06:00 AM UTC                                              │
│       │                                                    │
│       ▼                                                    │
│  ┌────────────┐                                            │
│  │   WORKER   │  1. Busca partidos nuevos                 │
│  │   CRON     │     desde última fecha en DB              │
│  │            │                                            │
│  │  2. Llama  │  2. Consulta API-Football                 │
│  │  API-Foot  │     (20 ligas prioritarias)               │
│  │     ball   │                                            │
│  │            │  3. Guarda nuevos partidos en PostgreSQL  │
│  │  3. Guarda │                                            │
│  │   en DB    │  4. Si hay datos nuevos:                  │
│  │            │     • Re-entrena modelo ML                │
│  │  4. ML     │     • Guarda métricas                     │
│  │  Training  │     • Limpia logs viejos                  │
│  │            │                                            │
│  └─────┬──────┘                                            │
│        │                                                   │
│        ▼                                                   │
│  ┌────────────┐                                            │
│  │    WEB     │  5. Usuarios ven predicciones             │
│  │    APP     │     con datos actualizados                │
│  │            │                                            │
│  └────────────┘                                            │
│                                                            │
│  ┌────────────┐                                            │
│  │  BACKUP    │  Diario a las 04:00 AM UTC                │
│  │  AUTOMÁTICO│  • JSON export                             │
│  │            │  • Mantiene últimos 5 backups             │
│  └────────────┘                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Comandos útiles

### Backup manual
```bash
railway run npm run db:backup
```

### Limpieza de datos viejos
```bash
railway run npm run db:cleanup
```

### Ver estado de sincronización
```bash
curl https://tu-app.railway.app/api/sync/status
```

### Forzar sincronización manual
```bash
curl -X POST https://tu-app.railway.app/api/sync \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

### Conectar a PostgreSQL
```bash
railway connect postgres
```

### Ver logs en tiempo real
```bash
railway logs -f
```

---

## 🆚 Preparar para DG Dental

Cuando quieras agregar DG Dental al mismo plan de $20:

### Opción A: Mismo proyecto, nuevo servicio (Recomendado)

```
Project: Mi Negocio ($20/mes total)
├── 🌐 dg-picks-web       ($8)  ← Compartes costos
├── 🔄 dg-picks-worker    ($5)  ← entre servicios
├── 🐘 shared-postgres    ($5)  ← misma DB o separada
├── 🌐 dg-dental-web      (gratis) ← CPU compartido
└── 🔄 dg-dental-worker   (gratis) ← CPU compartido
```

Railway cobra por **uso real**, no por número de servicios.

### Opción B: Proyecto separado

Crea otro proyecto en Railway con el mismo billing.

---

## ✅ Checklist final

Antes de dar por terminado:

- [ ] Web app carga en tu dominio
- [ ] `/api/sync/status` devuelve datos correctos
- [ ] Worker está corriendo (logs activos)
- [ ] PostgreSQL conectado (muestra partidos)
- [ ] Seed completado (27k+ partidos)
- [ ] Modelo ML entrenado al menos una vez
- [ ] Predicciones funcionan correctamente
- [ ] Cron job sincronizó al menos una vez
- [ ] Backup automático configurado
- [ ] Notificaciones de error activas
- [ ] Límites de uso configurados (para no pasarte de $20)

---

## 💡 Tips para maximizar tus $20

1. **Monitorea el uso**: Railway dashboard → Usage
2. **Configura límites**: Settings → Usage Limits → $20
3. **Optimiza queries**: Usa índices de Prisma
4. **Limpia logs**: Corre `npm run db:cleanup` semanal
5. **Revisa backups**: No dejes que ocupen todo el storage

---

## 🎉 Listo!

Con esta configuración tienes:
- ⚡ App ultra rápida (2GB RAM)
- 🔄 Sincronización automática sin depender de terceros
- 🐘 Base de datos potente (10GB storage)
- 💾 Backups automáticos
- 📊 Capacidad para 100k+ partidos

**Total: $20/mes para DG Picks funcionando como un reloj ⌚**

¿Te animas a hacer el deploy? 🚀
