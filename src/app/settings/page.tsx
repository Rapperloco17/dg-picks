'use client';

import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, Bell, Settings2, Calculator } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">
          Personaliza tu experiencia en DG Picks
        </p>
      </div>

      {/* Appearance */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            <CardTitle className="text-slate-100 text-base">Apariencia</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Personaliza cómo se muestra la información
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Formato de cuotas</Label>
              <p className="text-xs text-slate-500">Cómo se muestran las cuotas</p>
            </div>
            <Select 
              value={settings.oddsFormat} 
              onValueChange={(v) => updateSettings({ oddsFormat: v as any })}
            >
              <SelectTrigger className="w-[140px] bg-slate-950 border-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="decimal" className="text-slate-100 focus:bg-slate-800">Decimal (1.85)</SelectItem>
                <SelectItem value="american" className="text-slate-100 focus:bg-slate-800">Americana (-118)</SelectItem>
                <SelectItem value="fractional" className="text-slate-100 focus:bg-slate-800">Fraccionaria (17/20)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-slate-800" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tema oscuro</Label>
              <p className="text-xs text-slate-500">Activa el modo oscuro (siempre activo)</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-400" />
            <CardTitle className="text-slate-100 text-base">Notificaciones</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Configura las alertas que recibes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones activadas</Label>
              <p className="text-xs text-slate-500">Recibe alertas de picks y partidos</p>
            </div>
            <Switch 
              checked={settings.notifications} 
              onCheckedChange={(v) => updateSettings({ notifications: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Betting Settings */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-400" />
            <CardTitle className="text-slate-100 text-base">Configuración de Apuestas</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Valores por defecto para tus picks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Stake por defecto</Label>
              <span className="text-sm text-slate-400">{settings.defaultStake}u</span>
            </div>
            <Slider
              value={[settings.defaultStake]}
              onValueChange={([v]) => updateSettings({ defaultStake: v })}
              max={100}
              min={1}
              step={1}
            />
          </div>

          <Separator className="bg-slate-800" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fracción Kelly</Label>
              <span className="text-sm text-slate-400">{Math.round(settings.kellyFraction * 100)}%</span>
            </div>
            <Slider
              value={[settings.kellyFraction * 100]}
              onValueChange={([v]) => updateSettings({ kellyFraction: v / 100 })}
              max={100}
              min={5}
              step={5}
            />
            <p className="text-xs text-slate-500">
              Porcentaje del stake calculado por Kelly que se sugerirá
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-400" />
            <CardTitle className="text-slate-100 text-base">API Football</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Información de conexión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Estado</span>
            <span className="text-emerald-400 text-sm font-medium">● Conectado</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Límite diario</span>
            <span className="text-slate-100 text-sm">75,000 requests</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Versión API</span>
            <span className="text-slate-100 text-sm">v3</span>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-slate-900/50 border-slate-800/50">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-100">DG Picks</p>
            <p className="text-xs text-slate-500 mt-1">Versión 1.0.0 - Fase 1</p>
            <p className="text-xs text-slate-600 mt-2">
              Sistema avanzado de análisis deportivo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
