# ✅ Checklist de Deploy en Railway - Paso a Paso

## CHECKLIST (Ve marcando conforme avances)

### FASE 1: Preparación ✅
- [ ] Código subido a GitHub
- [ ] Railway cuenta creada y tarjeta agregada
- [ ] PostgreSQL creado en Railway

### FASE 2: Deploy Web App ✅
- [ ] Proyecto creado desde GitHub
- [ ] Variables de entorno configuradas
- [ ] Primer deploy exitoso (green check)

### FASE 3: Worker ✅
- [ ] Servicio worker creado
- [ ] Conectado a misma base de datos
- [ ] Worker corriendo (logs activos)

### FASE 4: Datos ✅
- [ ] Seed ejecutado (27k partidos cargados)
- [ ] Modelo entrenado inicial
- [ ] API /api/sync/status responde correctamente

### FASE 5: Verificación ✅
- [ ] Web carga en navegador
- [ ] Predicciones funcionan
- [ ] Todo listo!

---

## 📝 Comandos rápidos

### Seed de datos
```bash
npm run db:seed
```

### Entrenar modelo
```bash
npm run train-initial
```

### Verificar estado
```bash
curl https://TU-APP.railway.app/api/sync/status
```

---

## 🔧 Troubleshooting rápido

| Error | Solución |
|-------|----------|
| "Database not found" | Verificar DATABASE_URL en variables |
| "Build failed" | Revisar logs: `railway logs` |
| "Worker not starting" | Verificar que tenga las mismas variables |
| Seed muy lento | Normal, puede tardar 10 min |
