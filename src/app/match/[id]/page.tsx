'use client';

import { use, Suspense, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMatch } from '@/hooks/use-matches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Activity,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchStatsDialog } from '@/components/match/match-stats-dialog';
import { LiveMatchStats } from '@/components/match/live-match-stats';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default function MatchPageWrapper({ params }: MatchPageProps) {
  return (
    <Suspense fallback={<MatchDetailSkeleton />}>
      <MatchPage params={params} />
    </Suspense>
  );
}

function MatchPage({ params }: MatchPageProps) {
  const { id } = use(params);
  const fixtureId = parseInt(id);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('resumen');
  
  const { match, isLoading, isError } = useMatch(fixtureId);

  if (isLoading) {
    return <MatchDetailSkeleton />;
  }

  if (isError || !match) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-400">Error al cargar el partido</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { fixture, league, teams, goals } = match;
  const matchDate = new Date(fixture.date);
  
  const isLive = fixture.status.short === '1H' || 
                 fixture.status.short === '2H' || 
                 fixture.status.short === 'ET' ||
                 fixture.status.short === 'P';
  
  const isFinished = fixture.status.short === 'FT' || 
                     fixture.status.short === 'AET' || 
                     fixture.status.short === 'PEN';

  const openStats = (tab: string) => {
    setStatsTab(tab);
    setStatsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/">
        <Button variant="ghost" className="text-slate-400 hover:text-slate-100 -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </Link>

      {/* Match Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {/* League Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img 
              src={league.logo} 
              alt={league.name}
              className="w-8 h-8 object-contain"
            />
            <div>
              <p className="text-sm font-medium text-slate-100">{league.name}</p>
              <p className="text-xs text-slate-400">{league.round || 'Temporada Regular'}</p>
            </div>
          </div>
          
          {isLive && (
            <Badge variant="destructive" className="animate-pulse-live">
              <span className="w-2 h-2 rounded-full bg-white mr-2" />
              EN VIVO {fixture.status.elapsed}'
            </Badge>
          )}
          {isFinished && (
            <Badge variant="secondary" className="bg-slate-800">
              FINAL
            </Badge>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-center gap-8 md:gap-16">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center flex-1">
            <img 
              src={teams.home.logo} 
              alt={teams.home.name}
              className="w-20 h-20 md:w-24 md:h-24 object-contain mb-4"
            />
            <h2 className="text-lg md:text-xl font-bold text-slate-100">
              {teams.home.name}
            </h2>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center">
            {isLive || isFinished ? (
              <div className="flex items-center gap-4 text-4xl md:text-5xl font-bold">
                <span className={cn(
                  goals.home !== null && goals.home > (goals.away ?? 0) && "text-emerald-400"
                )}>
                  {goals.home ?? 0}
                </span>
                <span className="text-slate-600">:</span>
                <span className={cn(
                  goals.away !== null && goals.away > (goals.home ?? 0) && "text-emerald-400"
                )}>
                  {goals.away ?? 0}
                </span>
              </div>
            ) : (
              <div className="text-3xl md:text-4xl font-bold text-slate-300">
                {format(matchDate, 'HH:mm')}
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(matchDate, 'd MMM yyyy', { locale: es })}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center text-center flex-1">
            <img 
              src={teams.away.logo} 
              alt={teams.away.name}
              className="w-20 h-20 md:w-24 md:h-24 object-contain mb-4"
            />
            <h2 className="text-lg md:text-xl font-bold text-slate-100">
              {teams.away.name}
            </h2>
          </div>
        </div>

        {/* Match Info */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-800 text-sm text-slate-400">
          {fixture.referee && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {fixture.referee}
            </span>
          )}
          {fixture.venue.name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {fixture.venue.name}
              {fixture.venue.city && `, ${fixture.venue.city}`}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <Link href={`/picks/new?match=${fixture.id}`}>
            <Button className="bg-green-500 hover:bg-green-600">
              <Zap className="w-4 h-4 mr-2" />
              Crear Pick
            </Button>
          </Link>
          <Link href={`/match/${fixture.id}/stats`}>
            <Button variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Estadísticas Completas
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Match Statistics */}
      {(isLive || isFinished) && (
        <LiveMatchStats
          fixtureId={fixture.id}
          homeTeamName={teams.home.name}
          awayTeamName={teams.away.name}
          homeTeamLogo={teams.home.logo}
          awayTeamLogo={teams.away.logo}
          isLive={isLive}
          isFinished={isFinished}
        />
      )}

      {/* Analysis Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Analysis */}
        <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => openStats('resumen')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-100">Análisis Rápido</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Cuotas actuales, probabilidades ML y pick recomendado
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        {/* Full Stats */}
        <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => openStats('estadisticas')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-slate-100">Estadísticas Completas</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Forma, standings, H2H, tabla de posiciones
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        {/* ML Prediction */}
        <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => openStats('ml')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-slate-100">Predicción ML</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Modelo de machine learning con análisis de valor
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Pick CTA */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-green-900/50 border-blue-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">¿Listo para apostar?</h3>
              <p className="text-sm text-slate-400">
                Crea un pick con análisis de Kelly Criterion y seguimiento de resultados
              </p>
            </div>
            <Link href={`/picks/new?match=${fixture.id}`}>
              <Button className="bg-green-500 hover:bg-green-600 whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Crear Pick Ahora
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats Dialog */}
      <MatchStatsDialog 
        match={match} 
        open={statsOpen} 
        onOpenChange={setStatsOpen}
        defaultTab={statsTab}
      />
    </div>
  );
}

function MatchDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-24" />
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        
        <div className="flex items-center justify-center gap-16">
          <div className="flex flex-col items-center">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-12 w-24" />
          <div className="flex flex-col items-center">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
