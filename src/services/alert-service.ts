import { Match } from '@/types';
import { ProcessedMatchData } from './historical-data';
import { findAllValueBets, MarketType } from './market-models';

// Alert types
export type AlertType = 'value_bet' | 'high_confidence' | 'model_disagreement' | 'line_movement';

interface Alert {
  id: string;
  type: AlertType;
  matchId: number;
  match: Match;
  message: string;
  details: {
    market?: MarketType;
    selection?: string;
    probability?: number;
    odds?: number;
    ev?: number;
    confidence?: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  read: boolean;
}

// Alert configuration
interface AlertConfig {
  minEV: number;
  minConfidence: number;
  markets: MarketType[];
  leagues: number[];
  notifyValueBets: boolean;
  notifyHighConfidence: boolean;
  notifyModelDisagreement: boolean;
  lineMovementThreshold: number; // Percentage
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  minEV: 0.05,
  minConfidence: 60,
  markets: ['1X2', 'BTTS', 'OVER_UNDER_25'],
  leagues: [], // Empty = all leagues
  notifyValueBets: true,
  notifyHighConfidence: true,
  notifyModelDisagreement: true,
  lineMovementThreshold: 10,
};

// Store alerts
let alerts: Alert[] = [];
let alertConfig: AlertConfig = DEFAULT_ALERT_CONFIG;
const alertListeners: ((alerts: Alert[]) => void)[] = [];

/**
 * Initialize alert service
 */
export function initAlertService(config?: Partial<AlertConfig>): void {
  alertConfig = { ...DEFAULT_ALERT_CONFIG, ...config };
  
  // Load saved alerts
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dg-picks-alerts');
    if (saved) {
      alerts = JSON.parse(saved, (key, value) => {
        if (key === 'createdAt') return new Date(value);
        return value;
      });
    }
  }
}

/**
 * Subscribe to alerts
 */
export function subscribeToAlerts(callback: (alerts: Alert[]) => void): () => void {
  alertListeners.push(callback);
  callback(alerts); // Initial call
  
  return () => {
    const index = alertListeners.indexOf(callback);
    if (index > -1) alertListeners.splice(index, 1);
  };
}

/**
 * Notify all listeners
 */
function notifyListeners(): void {
  alertListeners.forEach(callback => callback([...alerts]));
  
  // Persist alerts
  if (typeof window !== 'undefined') {
    localStorage.setItem('dg-picks-alerts', JSON.stringify(alerts));
  }
}

/**
 * Create a new alert
 */
export function createAlert(
  type: AlertType,
  match: Match,
  details: Alert['details'],
  priority: Alert['priority'] = 'medium'
): Alert {
  const alert: Alert = {
    id: Math.random().toString(36).substring(2, 15),
    type,
    matchId: match.fixture.id,
    match,
    message: generateAlertMessage(type, match, details),
    details,
    priority,
    createdAt: new Date(),
    read: false,
  };
  
  // Add to beginning
  alerts.unshift(alert);
  
  // Keep only last 100 alerts
  if (alerts.length > 100) {
    alerts = alerts.slice(0, 100);
  }
  
  notifyListeners();
  
  // Show browser notification if enabled
  showBrowserNotification(alert);
  
  return alert;
}

/**
 * Generate alert message
 */
function generateAlertMessage(
  type: AlertType,
  match: Match,
  details: Alert['details']
): string {
  const matchName = `${match.teams.home.name} vs ${match.teams.away.name}`;
  
  switch (type) {
    case 'value_bet':
      return `💰 Valor detectado en ${matchName}: ${details.selection} @ ${details.odds?.toFixed(2)} (EV: +${((details.ev || 0) * 100).toFixed(1)}%)`;
    
    case 'high_confidence':
      return `🎯 Alta confianza en ${matchName}: ${details.selection} (${details.confidence}% probabilidad)`;
    
    case 'model_disagreement':
      return `⚠️ Desacuerdo del modelo en ${matchName}: Mercados muestran diferentes señales`;
    
    case 'line_movement':
      return `📊 Movimiento de línea en ${matchName}: Cuota cambió significativamente`;
    
    default:
      return `Alerta para ${matchName}`;
  }
}

/**
 * Show browser notification
 */
function showBrowserNotification(alert: Alert): void {
  if (typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  
  // Only show for high priority
  if (alert.priority !== 'high' && alert.priority !== 'critical') return;
  
  new Notification('DG Picks - Alerta de Valor', {
    body: alert.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: alert.id,
    requireInteraction: alert.priority === 'critical',
  });
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Scan matches for alerts
 */
export function scanMatchesForAlerts(
  matches: Match[],
  processedData: ProcessedMatchData[]
): Alert[] {
  const newAlerts: Alert[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const processed = processedData[i];
    
    if (!processed) continue;
    
    // Filter by league
    if (alertConfig.leagues.length > 0 && !alertConfig.leagues.includes(match.league.id)) {
      continue;
    }
    
    // Check for value bets
    if (alertConfig.notifyValueBets) {
      const simulatedOdds = {
        home: 2.0 + Math.random(),
        draw: 3.0 + Math.random() * 0.5,
        away: 2.0 + Math.random(),
        bttsYes: 1.9,
        bttsNo: 1.9,
        over25: 1.85,
        under25: 1.95,
      };
      
      try {
        const valueBets = findAllValueBets(processed, simulatedOdds, alertConfig.minEV);
        
        for (const bet of valueBets.slice(0, 2)) { // Max 2 per match
          const alert = createAlert(
            'value_bet',
            match,
            {
              market: bet.market,
              selection: bet.selection,
              probability: bet.probability,
              odds: bet.odds,
              ev: bet.ev,
              confidence: bet.confidence,
            },
            bet.ev > 0.1 ? 'high' : 'medium'
          );
          newAlerts.push(alert);
        }
      } catch (e) {
        // Models not trained yet
      }
    }
    
    // Check for high confidence predictions
    if (alertConfig.notifyHighConfidence) {
      // Would check model predictions here
    }
  }
  
  return newAlerts;
}

/**
 * Mark alert as read
 */
export function markAlertAsRead(alertId: string): void {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.read = true;
    notifyListeners();
  }
}

/**
 * Mark all alerts as read
 */
export function markAllAlertsAsRead(): void {
  alerts.forEach(a => a.read = true);
  notifyListeners();
}

/**
 * Delete alert
 */
export function deleteAlert(alertId: string): void {
  alerts = alerts.filter(a => a.id !== alertId);
  notifyListeners();
}

/**
 * Clear all alerts
 */
export function clearAllAlerts(): void {
  alerts = [];
  notifyListeners();
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return alerts.filter(a => !a.read).length;
}

/**
 * Get alerts by type
 */
export function getAlertsByType(type: AlertType): Alert[] {
  return alerts.filter(a => a.type === type);
}

/**
 * Get high priority alerts
 */
export function getHighPriorityAlerts(): Alert[] {
  return alerts.filter(a => a.priority === 'high' || a.priority === 'critical');
}

/**
 * Update alert config
 */
export function updateAlertConfig(config: Partial<AlertConfig>): void {
  alertConfig = { ...alertConfig, ...config };
  
  // Persist config
  if (typeof window !== 'undefined') {
    localStorage.setItem('dg-picks-alert-config', JSON.stringify(alertConfig));
  }
}

/**
 * Get alert config
 */
export function getAlertConfig(): AlertConfig {
  return { ...alertConfig };
}

/**
 * Get all alerts
 */
export function getAllAlerts(): Alert[] {
  return [...alerts];
}

export type { Alert, AlertConfig };
export { DEFAULT_ALERT_CONFIG };
