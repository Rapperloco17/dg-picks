'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMatch } from '@/hooks/use-matches';
import { usePicksStore } from '@/stores/picks-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calculator, Save, TrendingUp, AlertCircle, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { MarketType } from '@/types';
import { calculateKellyStake, getKellySuggestion } from '@/services/kelly-criterion';

const markets: { value: MarketType; label: string }[] = [
  { value: '1X2', label: '1X2 - Resultado' },
  { value: 'DOUBLE_CHANCE', label: 'Doble Oportunidad' },
  { value: 'OVER_UNDER', label: 'Over/Under' },
  { value: 'OVER_UNDER_25', label: 'Over/Under 2.5' },
  { value: 'OVER_UNDER_15', label: 'Over/Under 1.5' },
  { value: 'OVER_UNDER_35', label: 'Over/Under 3.5' },
  { value: 'BTTS', label: 'Ambos Marcan' },
  { value: 'ASIAN_HANDICAP', label: 'Hándicap Asiático' },
  { value: 'CORNERS', label: 'Córners' },
  { value: 'CARDS', label: 'Tarjetas' },
];

const selectionsByMarket: Record<MarketType, string[]> = {
  '1X2': ['1', 'X', '2'],
  'DOUBLE_CHANCE': ['1X', '12', 'X2'],
  'OVER_UNDER': ['Over 1.5', 'Under 1.5', 'Over 2.5', 'Under 2.5', 'Over 3.5', 'Under 3.5'],
  'OVER_UNDER_25': ['Over 2.5', 'Under 2.5'],
  'OVER_UNDER_15': ['Over 1.5', 'Under 1.5'],
  'OVER_UNDER_35': ['Over 3.5', 'Under 3.5'],
  'BTTS': ['Sí', 'No'],
  'ASIAN_HANDICAP': ['H1 -1.5', 'H1 -1', 'H1 -0.5', 'H1 0', 'H1 +0.5', 'H1 +1', 'H1 +1.5', 'H2 -1.5', 'H2 -1', 'H2 -0.5', 'H2 0', 'H2 +0.5', 'H2 +1', 'H2 +1.5'],
  'CORNERS': ['Over 8.5', 'Under 8.5', 'Over 9.5', 'Under 9.5', 'Over 10.5', 'Under 10.5'],
  'CARDS': ['Over 3.5', 'Under 3.5', 'Over 4.5', 'Under 4.5'],
};

// Default bankroll for calculations
const DEFAULT_BANKROLL = 1000;

// Main component wrapped in Suspense
export default function NewPickPage() {
  return (
    <Suspense fallback={<NewPickSkeleton />}>
      <NewPickForm />
    </Suspense>
  );
}

function NewPickForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match');
  
  const { match } = useMatch(matchId ? parseInt(matchId) : null);
  const { addPick } = usePicksStore();
  
  const [market, setMarket] = useState<MarketType>('1X2');
  const [selection, setSelection] = useState('');
  const [odds, setOdds] = useState('');
  const [stake, setStake] = useState('10');
  const [confidence, setConfidence] = useState([5]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKellyInfo, setShowKellyInfo] = useState(false);

  // Reset selection when market changes
  useEffect(() => {
    setSelection('');
  }, [market]);

  // Calculate Kelly Criterion
  const kellyResult = (() => {
    const oddsValue = parseFloat(odds);
    if (!oddsValue || oddsValue <= 1 || !selection) return null;
    
    // Estimate probability based on confidence level
    const baseProbability = 0.3 + (confidence[0] / 10) * 0.4; // 30% to 70%
    
    try {
      return calculateKellyStake({
        bankroll: DEFAULT_BANKROLL,
        odds: oddsValue,
        probability: baseProbability,
        confidence: confidence[0],
        fraction: 0.25,
        maxStakePercent: 0.05,
      });
    } catch {
      return null;
    }
  })();

  const handleApplyKelly = () => {
    if (kellyResult && kellyResult.recommendedStake > 0) {
      setStake(kellyResult.recommendedStake.toFixed(1));
      toast.success(`Stake de Kelly aplicado: ${kellyResult.recommendedStake.toFixed(1)}u`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!match) {
      toast.error('No se ha seleccionado un partido');
      return;
    }
    
    if (!selection || !odds || !stake) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const oddsValue = parseFloat(odds);
    if (oddsValue <= 1) {
      toast.error('La cuota debe ser mayor a 1');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const pickId = await addPick({
        userId: 'demo-user',
        matchId: match.fixture.id,
        leagueId: match.league.id,
        leagueName: match.league.name,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        matchDate: match.fixture.date,
        market,
        selection,
        odds: oddsValue,
        stake: parseFloat(stake),
        confidence: confidence[0] as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
        notes: notes || '',
      });
      
      toast.success('Pick creado exitosamente');
      router.push('/picks');
    } catch (error) {
      toast.error('Error al crear el pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={match ? `/match/${match.fixture.id}` : '/matches'}>
          <Button variant="ghost" size="icon" className="text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Nuevo Pick</h1>
          <p className="text-sm text-slate-400">Crea un nuevo seguimiento de apuesta</p>
        </div>
      </div>

      {/* Match Info */}
      {match && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center text-center">
                <img 
                  src={match.teams.home.logo} 
                  alt={match.teams.home.name}
                  className="w-12 h-12 object-contain mb-2"
                />
                <span className="text-sm font-medium text-slate-100">
                  {match.teams.home.name}
                </span>
              </div>
              <div className="text-slate-500 text-lg font-bold">VS</div>
              <div className="flex flex-col items-center text-center">
                <img 
                  src={match.teams.away.logo} 
                  alt={match.teams.away.name}
                  className="w-12 h-12 object-contain mb-2"
                />
                <span className="text-sm font-medium text-slate-100">
                  {match.teams.away.name}
                </span>
              </div>
            </div>
            <div className="text-center mt-3">
              <Badge variant="secondary" className="bg-slate-800">
                {match.league.name}
              </Badge>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(match.fixture.date).toLocaleString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">Detalles del Pick</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market */}
            <div className="space-y-2">
              <Label htmlFor="market">Mercado</Label>
              <Select value={market} onValueChange={(v) => setMarket(v as MarketType)}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {markets.map((m) => (
                    <SelectItem 
                      key={m.value} 
                      value={m.value}
                      className="text-slate-100 focus:bg-slate-800"
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection */}
            <div className="space-y-2">
              <Label htmlFor="selection">Selección</Label>
              <Select value={selection} onValueChange={setSelection}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {selectionsByMarket[market].map((sel) => (
                    <SelectItem 
                      key={sel} 
                      value={sel}
                      className="text-slate-100 focus:bg-slate-800"
                    >
                      {sel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Odds */}
            <div className="space-y-2">
              <Label htmlFor="odds">Cuota</Label>
              <Input
                id="odds"
                type="number"
                step="0.01"
                min="1.01"
                placeholder="1.85"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                className="bg-slate-950 border-slate-800"
                required
              />
            </div>

            {/* Confidence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Confianza (1-10)</Label>
                <Badge variant="secondary" className="bg-slate-800">
                  {confidence[0]}/10
                </Badge>
              </div>
              <Slider
                value={confidence}
                onValueChange={setConfidence}
                max={10}
                min={1}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Baja</span>
                <span>Media</span>
                <span>Alta</span>
              </div>
            </div>

            {/* Kelly Criterion Section */}
            {kellyResult && (
              <Card className={`border ${kellyResult.expectedValue > 0 ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Kelly Criterion
                    {kellyResult.expectedValue > 0 ? (
                      <Badge className="bg-green-500 text-xs">+EV</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">-EV</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* EV Display */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor Esperado (EV):</span>
                    <span className={kellyResult.expectedValue > 0 ? 'text-green-500 font-bold' : 'text-yellow-500'}>
                      {(kellyResult.expectedValue * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  {/* Suggestion */}
                  <p className="text-xs text-muted-foreground">
                    {getKellySuggestion(kellyResult.expectedValue)}
                  </p>

                  {/* Kelly Calculation */}
                  {kellyResult.expectedValue > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Kelly Completo:</span>
                          <div className="font-bold">{kellyResult.fullKellyStake.toFixed(1)}u</div>
                          <span className="text-xs text-muted-foreground">({(kellyResult.percentageOfBankroll * 4).toFixed(1)}%)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Kelly 1/4 (Recomendado):</span>
                          <div className="font-bold text-green-500">{kellyResult.recommendedStake.toFixed(1)}u</div>
                          <span className="text-xs text-muted-foreground">({kellyResult.percentageOfBankroll.toFixed(1)}% del bankroll)</span>
                        </div>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={handleApplyKelly}
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Aplicar Stake Recomendado ({kellyResult.recommendedStake.toFixed(1)}u)
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stake */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="stake">Stake (unidades)</Label>
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map((unit) => (
                    <Button
                      key={unit}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0 px-2 text-xs text-slate-400 hover:text-slate-100"
                      onClick={() => setStake(unit.toString())}
                    >
                      {unit}u
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                id="stake"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="10"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="bg-slate-950 border-slate-800"
                required
              />
              <p className="text-xs text-slate-500">
                Basado en bankroll de {DEFAULT_BANKROLL}u
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Análisis, razones, contexto..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-950 border-slate-800 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/picks" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button 
            type="submit" 
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Guardar Pick'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NewPickSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 bg-slate-800" />
        <div>
          <Skeleton className="h-8 w-32 bg-slate-800 mb-2" />
          <Skeleton className="h-4 w-48 bg-slate-800" />
        </div>
      </div>
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 space-y-4">
          <Skeleton className="h-12 w-full bg-slate-800" />
          <Skeleton className="h-12 w-full bg-slate-800" />
          <Skeleton className="h-12 w-full bg-slate-800" />
        </CardContent>
      </Card>
    </div>
  );
}
