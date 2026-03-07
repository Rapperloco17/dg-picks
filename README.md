# DG Picks - Sistema ML Avanzado para Apuestas Deportivas

Sistema profesional de análisis deportivo con Machine Learning, predicciones en tiempo real, backtesting y gestión completa de picks.

## 🎯 Características Principales

### ✅ Implementado (Fase 2 + ML Avanzado)

| Módulo | Descripción |
|--------|-------------|
| **76 Ligas** | TIER 1-2-3 de todo el mundo |
| **Firebase** | Auth + Firestore + Cache inteligente |
| **ML Predictivo** | TensorFlow.js con múltiples modelos |
| **Backtesting** | Simulación histórica con métricas |
| **Alertas** | Notificaciones de valor en tiempo real |
| **6 Temporadas** | Datos de 2020-2025 |

## 🤖 Sistema de Machine Learning

### Modelos Disponibles

| Modelo | Mercado | Features | Accuracy Esperada |
|--------|---------|----------|-------------------|
| 1X2 | Resultado | 28 | 52-56% |
| BTTS | Ambos marcan | 20 | 55-60% |
| Over/Under 2.5 | Goles | 24 | 54-58% |
| Over/Under 1.5 | Goles | 24 | 58-62% |
| Corners | Córners | 16 | 52-55% |

### Features Calculadas (28 totales)

#### Forma y Rendimiento (10)
- Últimos 5 partidos local/visitante
- Puntos obtenidos (3-1-0)
- Tendencia de forma

#### Métricas de Goles (8)
- Media goles marcados/concedidos
- xG estimado (expected goals)
- Clean sheets ratio
- BTTS ratio

#### H2H y Contexto (6)
- Historial directo (últimos 10)
- Factor cancha
- Factor derbi
- Factor revancha

#### Avanzadas (4)
- Fatiga del equipo
- Rotación estimada
- Presión por posición
- Impacto lesiones

### Arquitectura de Red Neuronal

```
Input Layer:        28 features (normalizadas 0-1)
├─ Forma (10)
├─ Goles (8)
├─ H2H/Contexto (6)
└─ Avanzadas (4)

Hidden Layer 1:     64 neurons
├─ Activation: ReLU
├─ Dropout: 30%
└─ L2 Regularization: 0.01

Hidden Layer 2:     32 neurons
├─ Activation: ReLU
├─ Dropout: 20%
└─ L2 Regularization: 0.01

Hidden Layer 3:     16 neurons
├─ Activation: ReLU
└─ Dropout: 20%

Output Layer:       3 neurons
├─ 1 (Home Win)
├─ X (Draw)
├─ 2 (Away Win)
└─ Activation: Softmax

Optimizer:          Adam
Learning Rate:      0.001
Loss:               Categorical Crossentropy
Batch Size:         32
Epochs:             100
```

## 📊 Sistema de Backtesting

### Configuración

```typescript
interface BacktestConfig {
  minOdds: number;          // 1.5 - 5.0
  maxOdds: number;          // Filtro de cuotas
  minProbability: number;   // 30 - 80%
  maxProbability: number;   // Evitar overfitting
  minEV: number;            // 0.05 - 0.20 (5-20%)
  stake: number;            // Unidades base
  kellyFraction: number;    // 0.1 - 0.5
}
```

### Métricas Calculadas

| Métrica | Descripción |
|---------|-------------|
| ROI | Retorno sobre inversión |
| Yield | Retorno sobre stake total |
| Win Rate | % aciertos |
| Sharpe Ratio | Rendimiento ajustado por riesgo |
| Max Drawdown | Pérdida máxima consecutiva |
| Profit Factor | Ganancias/Pérdidas |

## 🚨 Sistema de Alertas

### Tipos de Alertas

1. **Value Bet** - EV > 5% detectado
2. **High Confidence** - Predicción > 70%
3. **Model Disagreement** - Diferencia entre modelos
4. **Line Movement** - Cambio significativo en cuotas

### Configuración

```typescript
interface AlertConfig {
  minEV: number;
  minConfidence: number;
  markets: MarketType[];
  leagues: number[];
  notifyValueBets: boolean;
  notifyHighConfidence: boolean;
}
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── admin/           # Recolección de datos
│   ├── ml/             # Panel ML + Backtesting
│   ├── auth/           # Login/Registro
│   └── ...
├── services/
│   ├── api-football.ts    # API Football client
│   ├── historical-data.ts # Extracción datos
│   ├── advanced-features.ts # Features avanzadas
│   ├── ml-model.ts        # Red neuronal
│   ├── market-models.ts   # Modelos por mercado
│   ├── backtesting.ts     # Simulación histórica
│   ├── alert-service.ts   # Notificaciones
│   └── cache-service.ts   # Cache Firestore
├── stores/
│   ├── auth-store.ts   # Firebase Auth
│   ├── picks-store.ts  # Picks + sync
│   └── app-store.ts    # UI state
└── components/
    ├── ui/            # shadcn/ui
    ├── layout/        # Sidebar, Header
    ├── matches/       # Match cards
    └── dashboard/     # Stats
```

## 🚀 Guía de Uso

### 1. Recolectar Datos Históricos

```bash
# Ir a Admin → Recolección
# Seleccionar temporadas (recomendado: 2020-2025)
# Hacer clic en "Iniciar Recolección"
# Esperar ~10-30 minutos (depende de rate limits)
```

### 2. Entrenar Modelos

```bash
# Ir a ML → Entrenamiento
# Requisito: Mínimo 100 partidos
# Hacer clic en "Entrenar Todos"
# Esperar ~2-5 minutos
# Guardar modelo entrenado
```

### 3. Ejecutar Backtest

```bash
# Ir a ML → Backtest
# Configurar parámetros:
#   - Min EV: 5%
#   - Min Prob: 50%
#   - Kelly: 25%
# Hacer clic en "Ejecutar Backtest"
# Analizar resultados y métricas
```

### 4. Usar Predicciones

```typescript
// Ejemplo de uso en código
import { predictMarket, findAllValueBets } from '@/services/market-models';

const prediction = predictMarket(matchData, '1X2');
// Resultado: { probabilities: [45, 25, 30], prediction: '1', confidence: 45 }

const valueBets = findAllValueBets(matchData, odds, 0.05);
// Resultado: Array de apuestas con valor positivo
```

## 📈 Cálculo de Valor (EV)

```typescript
// Fórmula de Expected Value
EV = (Probabilidad × Cuota) - 1

// Ejemplo:
// Probabilidad modelo: 55%
// Cuota bookmaker: 2.0
EV = (0.55 × 2.0) - 1 = 0.10 = +10%

// Interpretación:
// EV > 0.05  → Valor detectado ✅
// EV > 0.10  → Buen valor ✅✅
// EV > 0.15  → Excelente valor ✅✅✅
```

## 💾 Persistencia

### Almacenamiento Local
- Modelos ML: IndexedDB / localStorage
- Configuración: localStorage
- Alertas: localStorage

### Firebase Firestore
```
collections:
  users/{userId}/
    ├── profile
    ├── settings
    ├── bankroll
    └── picks/{pickId}
  
  training_data/
    └── {matchId}  // Datos procesados para ML
    
  matches_cache/
    ├── fixtures
    ├── live
    ├── h2h
    └── statistics
```

## 🔧 Configuración

### Variables de Entorno

```env
# API Football (obligatorio)
NEXT_PUBLIC_API_FOOTBALL_KEY=tu_api_key
NEXT_PUBLIC_API_FOOTBALL_URL=https://v3.football.api-sports.io

# Firebase (opcional pero recomendado)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd dg-picks

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev

# Build producción
npm run build
npm start
```

## 📊 Rendimiento Esperado

Basado en benchmarks y literatura científica:

| Métrica | Objetivo Realista | Objetivo Optimista |
|---------|-------------------|-------------------|
| Accuracy 1X2 | 53% | 56% |
| Accuracy BTTS | 58% | 62% |
| Accuracy O/U 2.5 | 56% | 60% |
| ROI Anual | +3% | +8% |
| Sharpe Ratio | 0.8 | 1.5 |
| Max Drawdown | -20% | -10% |

### Notas Importantes

1. **El fútbol es altamente incierto**: Incluso los mejores modelos tienen <60% accuracy
2. **Gestión de bankroll es crítica**: Usar Kelly Criterion o fracción fija
3. **Long term matters**: Se necesitan 500+ apuestas para significancia estadística
4. **Los mercados eficientes son difíciles**: Enfocarse en ligas menores puede dar ventaja

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Estado | Zustand + persist |
| Backend | Firebase (Auth + Firestore) |
| ML | TensorFlow.js |
| Charts | Recharts |
| API | api-football.com |

## 📝 Licencia

Proyecto privado - DG Picks 2025

---

**Disclaimer**: Este software es para fines educativos. Las apuestas deportivas conllevan riesgo de pérdida. Juega responsablemente.
#   D e p l o y   t r i g g e r   2 0 2 6 - 0 3 - 0 7   1 5 : 3 0  
 