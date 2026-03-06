import { EnsemblePredictionResult } from './ensemble-predictions';
import { toast } from 'sonner';

// Storage keys
const STORAGE_KEYS = {
  sentNotifications: 'dg-picks-sent-notifications',
  notificationSettings: 'dg-picks-notification-settings',
};

// Notification types
export interface ValueAlert {
  id: string;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  market: string;
  selection: string;
  ev: number;
  probability: number;
  odds?: number;
  sentAt: string;
  acknowledged: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  minEV: number;
  minConfidence: 'high' | 'medium' | 'low';
  minConsensus: 'strong' | 'moderate' | 'weak';
  onlyRealOdds: boolean;
  onlyTier1: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  cooldownMinutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  minEV: 0.15, // 15%
  minConfidence: 'medium',
  minConsensus: 'moderate',
  onlyRealOdds: false,
  onlyTier1: false,
  pushEnabled: false,
  soundEnabled: true,
  cooldownMinutes: 60, // No repeat same match for 1 hour
};

// Get notification settings
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  const stored = localStorage.getItem(STORAGE_KEYS.notificationSettings);
  if (!stored) return DEFAULT_SETTINGS;
  
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save notification settings
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.notificationSettings, JSON.stringify(settings));
}

// Get sent notifications
function getSentNotifications(): ValueAlert[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEYS.sentNotifications);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save sent notification
function saveSentNotification(alert: ValueAlert): void {
  if (typeof window === 'undefined') return;
  
  const existing = getSentNotifications();
  const updated = [alert, ...existing].slice(0, 100); // Keep last 100
  localStorage.setItem(STORAGE_KEYS.sentNotifications, JSON.stringify(updated));
}

// Check if notification was recently sent
function wasRecentlyNotified(matchId: number, market: string, selection: string, cooldownMinutes: number): boolean {
  const sent = getSentNotifications();
  const cutoff = Date.now() - (cooldownMinutes * 60 * 1000);
  
  return sent.some(n => 
    n.matchId === matchId && 
    n.market === market && 
    n.selection === selection &&
    new Date(n.sentAt).getTime() > cutoff
  );
}

// Play notification sound
function playAlertSound(): void {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Audio play failed (user interaction needed first)
    });
  } catch {
    // Audio not supported
  }
}

// Request push notification permission
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Send push notification
function sendPushNotification(alert: ValueAlert): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  new Notification('🎯 Valor Detectado - DG Picks', {
    body: `${alert.homeTeam} vs ${alert.awayTeam}\n${alert.market} - ${alert.selection}\nEV: +${(alert.ev * 100).toFixed(1)}%`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: alert.id,
    requireInteraction: true,
  });
}

// Check if prediction meets notification criteria
function meetsCriteria(
  prediction: EnsemblePredictionResult['predictions'][0],
  result: EnsemblePredictionResult,
  settings: NotificationSettings
): boolean {
  // Check EV threshold
  if (prediction.ev < settings.minEV) return false;
  
  // Check confidence
  const confidenceLevels = { high: 3, medium: 2, low: 1 };
  if (confidenceLevels[prediction.confidence] < confidenceLevels[settings.minConfidence]) {
    return false;
  }
  
  // Check consensus
  const consensusLevels = { strong: 3, moderate: 2, weak: 1 };
  if (consensusLevels[prediction.consensus] < consensusLevels[settings.minConsensus]) {
    return false;
  }
  
  // Check real odds requirement
  if (settings.onlyRealOdds && !result.usingRealOdds) return false;
  
  // Check tier 1 requirement
  if (settings.onlyTier1 && result.leagueTier !== 1) return false;
  
  return true;
}

// Send value alert
function sendValueAlert(
  result: EnsemblePredictionResult,
  prediction: EnsemblePredictionResult['predictions'][0]
): void {
  const settings = getNotificationSettings();
  
  // Check if already notified recently
  if (wasRecentlyNotified(result.match.fixture.id, prediction.market, prediction.selection, settings.cooldownMinutes)) {
    return;
  }
  
  const alert: ValueAlert = {
    id: `${result.match.fixture.id}-${prediction.market}-${prediction.selection}-${Date.now()}`,
    matchId: result.match.fixture.id,
    homeTeam: result.match.teams.home.name,
    awayTeam: result.match.teams.away.name,
    leagueName: result.match.league.name,
    market: prediction.market,
    selection: prediction.selection,
    ev: prediction.ev,
    probability: prediction.probability,
    odds: prediction.odds,
    sentAt: new Date().toISOString(),
    acknowledged: false,
  };
  
  // Save to history
  saveSentNotification(alert);
  
  // Show toast notification (text only version for TS file)
  const toastMessage = `🎯 ${alert.homeTeam} vs ${alert.awayTeam} | ${alert.market} - ${alert.selection} | EV +${(alert.ev * 100).toFixed(1)}%`;
  
  toast.success(toastMessage, {
    duration: 10000, // 10 seconds
    action: {
      label: 'Ver',
      onClick: () => {
        // Navigate to ML page predictions tab
        window.location.href = '/ml';
      },
    },
  });
  
  // Play sound if enabled
  if (settings.soundEnabled) {
    playAlertSound();
  }
  
  // Send push notification if enabled
  if (settings.pushEnabled) {
    sendPushNotification(alert);
  }
  
  console.log(`[Notification] Value alert sent for ${alert.homeTeam} vs ${alert.awayTeam} - ${alert.market} ${alert.selection} (+${(alert.ev * 100).toFixed(1)}% EV)`);
}

// Process predictions and send alerts
export function processValueAlerts(results: EnsemblePredictionResult[]): void {
  const settings = getNotificationSettings();
  
  if (!settings.enabled) {
    return;
  }
  
  for (const result of results) {
    for (const prediction of result.predictions) {
      if (meetsCriteria(prediction, result, settings)) {
        sendValueAlert(result, prediction);
      }
    }
  }
}

// Get recent alerts
export function getRecentAlerts(hours: number = 24): ValueAlert[] {
  const sent = getSentNotifications();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  
  return sent
    .filter(n => new Date(n.sentAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

// Acknowledge alert
export function acknowledgeAlert(alertId: string): void {
  const sent = getSentNotifications();
  const updated = sent.map(n => 
    n.id === alertId ? { ...n, acknowledged: true } : n
  );
  localStorage.setItem(STORAGE_KEYS.sentNotifications, JSON.stringify(updated));
}

// Clear all alerts
export function clearAllAlerts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.sentNotifications);
}

// Check if browser supports notifications
export function supportsNotifications(): boolean {
  return 'Notification' in window;
}

// Get notification permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
