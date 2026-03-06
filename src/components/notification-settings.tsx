'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Smartphone,
  Target,
  TrendingUp,
  Shield,
  Info,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestPushPermission,
  supportsNotifications,
  getNotificationPermission,
  NotificationSettings,
  getRecentAlerts,
  clearAllAlerts,
  ValueAlert,
} from '@/services/notification-service';

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [recentAlerts, setRecentAlerts] = useState<ValueAlert[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermissionStatus(getNotificationPermission());
    loadRecentAlerts();
  }, []);

  const loadRecentAlerts = () => {
    setRecentAlerts(getRecentAlerts(24)); // Last 24 hours
  };

  const handleUpdateSettings = (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
    toast.success('Configuración guardada');
  };

  const handleRequestPush = async () => {
    const granted = await requestPushPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    
    if (granted) {
      handleUpdateSettings({ pushEnabled: true });
      toast.success('Notificaciones push activadas');
    } else {
      toast.error('Permiso denegado. Activa notificaciones en la configuración de tu navegador.');
    }
  };

  const handleClearAlerts = () => {
    if (confirm('¿Borrar todas las alertas recientes?')) {
      clearAllAlerts();
      loadRecentAlerts();
      toast.success('Alertas borradas');
    }
  };

  const confidenceLabels = {
    high: 'Alta (>60%)',
    medium: 'Media (>50%)',
    low: 'Baja (>40%)',
  };

  const consensusLabels = {
    strong: 'Fuerte (todos coinciden)',
    moderate: 'Moderado (60%+ coinciden)',
    weak: 'Débil (<60% coinciden)',
  };

  return (
    <div className="space-y-4">
      {/* Main Settings */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Alertas de Valor
              </CardTitle>
              <CardDescription className="text-slate-400">
                Recibe notificaciones cuando el ensemble detecte valor alto
              </CardDescription>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => handleUpdateSettings({ enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!settings.enabled && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-amber-400">
                Las alertas están desactivadas. Activa el switch para recibir notificaciones.
              </p>
            </div>
          )}

          {/* EV Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-400" />
                EV Mínimo para Alerta
              </Label>
              <Badge className="bg-emerald-500/10 text-emerald-400">
                +{(settings.minEV * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[settings.minEV * 100]}
              onValueChange={([v]) => handleUpdateSettings({ minEV: v / 100 })}
              min={5}
              max={30}
              step={1}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-slate-500">
              Se recomienda 15% para valor consistente, 20%+ para valor fuerte
            </p>
          </div>

          {/* Confidence & Consensus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Confianza Mínima</Label>
              <select
                value={settings.minConfidence}
                onChange={(e) => handleUpdateSettings({ minConfidence: e.target.value as any })}
                disabled={!settings.enabled}
                className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200"
              >
                <option value="high">{confidenceLabels.high}</option>
                <option value="medium">{confidenceLabels.medium}</option>
                <option value="low">{confidenceLabels.low}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Consenso Mínimo</Label>
              <select
                value={settings.minConsensus}
                onChange={(e) => handleUpdateSettings({ minConsensus: e.target.value as any })}
                disabled={!settings.enabled}
                className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200"
              >
                <option value="strong">{consensusLabels.strong}</option>
                <option value="moderate">{consensusLabels.moderate}</option>
                <option value="weak">{consensusLabels.weak}</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="space-y-3">
            <Label className="text-slate-200">Filtros Adicionales</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-200">Solo con odds reales</span>
                </div>
                <Switch
                  checked={settings.onlyRealOdds}
                  onCheckedChange={(checked) => handleUpdateSettings({ onlyRealOdds: checked })}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-200">Solo Tier 1 (ligas top)</span>
                </div>
                <Switch
                  checked={settings.onlyTier1}
                  onCheckedChange={(checked) => handleUpdateSettings({ onlyTier1: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          {/* Cooldown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-200">Cooldown (no repetir)</Label>
              <Badge className="bg-slate-700 text-slate-300">
                {settings.cooldownMinutes} min
              </Badge>
            </div>
            <Slider
              value={[settings.cooldownMinutes]}
              onValueChange={([v]) => handleUpdateSettings({ cooldownMinutes: v })}
              min={15}
              max={240}
              step={15}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-slate-500">
              No repetir alerta del mismo partido/market durante este tiempo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Methods */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-400" />
            Métodos de Notificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In-app Toast */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Notificaciones en app</p>
                <p className="text-xs text-slate-500">Toast notifications dentro de la app</p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-violet-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-200">Sonido</p>
                <p className="text-xs text-slate-500">Reproducir sonido con la alerta</p>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => handleUpdateSettings({ soundEnabled: checked })}
              disabled={!settings.enabled}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Push (escritorio/móvil)</p>
                <p className="text-xs text-slate-500">
                  {permissionStatus === 'granted' 
                    ? 'Activado' 
                    : permissionStatus === 'denied'
                    ? 'Bloqueado - revisa permisos del navegador'
                    : 'Requiere permiso'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {permissionStatus === 'granted' ? (
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => handleUpdateSettings({ pushEnabled: checked })}
                  disabled={!settings.enabled}
                />
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleRequestPush}
                  disabled={!settings.enabled || permissionStatus === 'denied'}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  Activar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 text-base">
              Alertas Recientes (24h)
            </CardTitle>
            {recentAlerts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAlerts}>
                <Trash2 className="w-4 h-4 mr-1" />
                Borrar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay alertas recientes</p>
              <p className="text-xs mt-1">
                Las alertas aparecerán cuando se detecte valor según tus criterios
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border ${
                    alert.acknowledged 
                      ? 'bg-slate-800/30 border-slate-700/50 opacity-60' 
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200">
                        {alert.homeTeam} vs {alert.awayTeam}
                      </p>
                      <p className="text-xs text-slate-500">
                        {alert.market} - {alert.selection}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-500/10 text-emerald-400">
                        +{(alert.ev * 100).toFixed(1)}%
                      </Badge>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(alert.sentAt).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
