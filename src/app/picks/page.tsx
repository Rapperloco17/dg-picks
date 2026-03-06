'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePicksStore } from '@/stores/picks-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  CheckCircle2, 
  XCircle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pick, PickStatus } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const statusConfig: Record<PickStatus, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendiente', icon: Target, color: 'bg-slate-500' },
  WON: { label: 'Ganado', icon: CheckCircle2, color: 'bg-emerald-500' },
  LOST: { label: 'Perdido', icon: XCircle, color: 'bg-rose-500' },
  VOID: { label: 'Nulo', icon: MinusCircle, color: 'bg-slate-500' },
  CANCELLED: { label: 'Cancelado', icon: MinusCircle, color: 'bg-slate-500' },
};

export default function PicksPage() {
  const { picks, deletePick, settlePick, duplicatePick, getStats } = usePicksStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const stats = getStats();

  const pendingPicks = picks.filter(p => p.result === 'PENDING');
  const settledPicks = picks.filter(p => p.result !== 'PENDING' && p.result !== 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mis Picks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona tus apuestas y seguimiento
          </p>
        </div>
        <Link href="/picks/new">
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pick
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total" 
          value={stats.totalPicks} 
          icon={Target}
          color="blue"
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`}
          trend={stats.winRate > 55 ? 'up' : stats.winRate < 45 ? 'down' : 'neutral'}
          icon={stats.winRate >= 50 ? TrendingUp : TrendingDown}
          color={stats.winRate >= 50 ? 'emerald' : 'rose'}
        />
        <StatCard 
          title="ROI" 
          value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
          trend={stats.roi > 0 ? 'up' : stats.roi < 0 ? 'down' : 'neutral'}
          icon={stats.roi >= 0 ? TrendingUp : TrendingDown}
          color={stats.roi >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard 
          title="Profit" 
          value={`${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(1)}`}
          icon={Target}
          color={stats.totalProfit >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Picks List */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="pending" className="data-[state=active]:bg-slate-800">
            Pendientes ({pendingPicks.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-800">
            Historial ({settledPicks.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
            Todos ({picks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingPicks.length === 0 ? (
            <EmptyState message="No tienes picks pendientes" />
          ) : (
            pendingPicks.map(pick => (
              <PickCard 
                key={pick.id} 
                pick={pick} 
                onDelete={() => setDeleteId(pick.id)}
                onSettle={(result) => settlePick(pick.id, result)}
                onDuplicate={() => duplicatePick(pick.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {settledPicks.length === 0 ? (
            <EmptyState message="No hay picks en el historial" />
          ) : (
            settledPicks.map(pick => (
              <PickCard 
                key={pick.id} 
                pick={pick} 
                onDelete={() => setDeleteId(pick.id)}
                onDuplicate={() => duplicatePick(pick.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {picks.length === 0 ? (
            <EmptyState message="No has creado ningún pick aún" />
          ) : (
            picks.map(pick => (
              <PickCard 
                key={pick.id} 
                pick={pick} 
                onDelete={() => setDeleteId(pick.id)}
                onSettle={pick.result === 'PENDING' ? (result) => settlePick(pick.id, result) : undefined}
                onDuplicate={() => duplicatePick(pick.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-slate-400">
              ¿Estás seguro de que quieres eliminar este pick? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteId) {
                  deletePick(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PickCardProps {
  pick: Pick;
  onDelete: () => void;
  onSettle?: (result: PickStatus) => void;
  onDuplicate: () => void;
}

function PickCard({ pick, onDelete, onSettle, onDuplicate }: PickCardProps) {
  const status = statusConfig[pick.result];
  const StatusIcon = status.icon;

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800",
      pick.result === 'WON' && "border-emerald-500/30",
      pick.result === 'LOST' && "border-rose-500/30",
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] bg-slate-800">
                {pick.leagueName}
              </Badge>
              <span className="text-xs text-slate-500">
                {new Date(pick.matchDate).toLocaleDateString('es-ES')}
              </span>
            </div>
            
            <h3 className="text-sm font-medium text-slate-100 truncate">
              {pick.homeTeam} vs {pick.awayTeam}
            </h3>
            
            <div className="flex items-center gap-3 mt-2">
              <Badge className={cn("text-[10px]", status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <span className="text-xs text-slate-400">
                {pick.market}: <span className="text-slate-200">{pick.selection}</span>
              </span>
              <span className="text-xs text-slate-400">
                Cuota: <span className="text-slate-200">{pick.odds.toFixed(2)}</span>
              </span>
              <span className="text-xs text-slate-400">
                Stake: <span className="text-slate-200">{pick.stake}</span>
              </span>
              {pick.confidence && (
                <span className="text-xs text-slate-400">
                  Conf: <span className="text-slate-200">{pick.confidence}/10</span>
                </span>
              )}
            </div>

            {pick.notes && (
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                {pick.notes}
              </p>
            )}

            {pick.result !== 'PENDING' && pick.profit !== null && (
              <div className={cn(
                "text-sm font-medium mt-2",
                pick.profit > 0 ? "text-emerald-400" : pick.profit < 0 ? "text-rose-400" : "text-slate-400"
              )}>
                {pick.profit > 0 ? '+' : ''}{pick.profit.toFixed(2)} u
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-2">
            {onSettle && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => onSettle('WON')}
                  title="Marcar como ganado"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => onSettle('LOST')}
                  title="Marcar como perdido"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-slate-300"
                  onClick={() => onSettle('VOID')}
                  title="Marcar como nulo"
                >
                  <MinusCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-slate-300"
                onClick={onDuplicate}
                title="Duplicar pick"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                onClick={onDelete}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  title, 
  value, 
  trend,
  icon: Icon,
  color = 'blue'
}: { 
  title: string; 
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
  color?: 'blue' | 'emerald' | 'rose' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{title}</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{value}</p>
          </div>
          <div className={cn("p-2 rounded-lg", colors[color])}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <Target className="w-8 h-8 text-slate-500" />
      </div>
      <p className="text-slate-400">{message}</p>
      <Link href="/picks/new">
        <Button variant="outline" className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Crear tu primer pick
        </Button>
      </Link>
    </div>
  );
}
