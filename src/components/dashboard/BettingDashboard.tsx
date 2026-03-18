'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Zap,
  Filter,
  ShoppingCart,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos de datos
interface OddsLine {
  bookmaker: string;
  home: number;
  draw: number;
  away: number;
  over25: number;
  under25: number;
  bttsYes: number;
  bttsNo: number;
}

interface MatchWithOdds {
  id: string;
  league: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeForm: string;
  awayForm: string;
  modelProbs: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    btts: number;
  };
  bestOdds: OddsLine;
  allOdds: OddsLine[];
  valueBets: ValuePick[];
  confidence: number;
}

interface ValuePick {
  id: string;
  matchId: string;
  market: string;
  selection: string;
  modelProb: number;
  bestOdds: number;
  impliedProb: number;
  edge: number;
  stake: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ParlaySuggestion {
  id: string;
  type: 'SAFE' | 'VALUE' | 'HIGH_ODDS';
  picks: ValuePick[];
  totalOdds: number;
  expectedValue: number;
  winProbability: number;
  description: string;
}

export function BettingDashboard() {
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState<MatchWithOdds[]>([]);
  const [parlays, setParlays] = useState<ParlaySuggestion[]>([]);
  const [cart, setCart] = useState<ValuePick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    const mockMatches = generateMockMatchesWithOdds();
    const generatedParlays = generateParlays(mockMatches);
    setMatches(mockMatches);
    setParlays(generatedParlays);
    setLoading(false);
  };

  const generateMockMatchesWithOdds = (): MatchWithOdds[] => {
    const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
    const teams = [
      ['Man City', 'Liverpool'], ['Real Madrid', 'Barcelona'], ['Inter', 'Juventus'],
      ['Bayern', 'Dortmund'], ['PSG', 'Marseille'], ['Arsenal', 'Chelsea'],
      ['Atletico', 'Sevilla'], ['Napoli', 'Roma'], ['Leverkusen', 'Leipzig']
    ];

    return teams.map(([home, away], i) => {
      // Probabilidades del modelo Poisson
      const modelProbs = {
        home: 0.35 + Math.random() * 0.30,
        draw: 0.20 + Math.random() * 0.15,
        away: 0.25 + Math.random() * 0.25,
        over25: 0.50 + Math.random() * 0.25,
        btts: 0.45 + Math.random() * 0.20
      };

      // Odds de diferentes casas (simulando mercado real)
      const allOdds: OddsLine[] = [
        { bookmaker: 'Bet365', home: 2.10, draw: 3.40, away: 3.60, over25: 1.85, under25: 2.00, bttsYes: 1.75, bttsNo: 2.05 },
        { bookmaker: 'Pinnacle', home: 2.15, draw: 3.35, away: 3.55, over25: 1.88, under25: 1.98, bttsYes: 1.78, bttsNo: 2.02 },
        { bookmaker: '1xBet', home: 2.08, draw: 3.45, away: 3.65, over25: 1.82, under25: 2.03, bttsYes: 1.72, bttsNo: 2.08 },
      ];

      // Encontrar mejores odds
      const bestOdds: OddsLine = {
        bookmaker: 'Mejor',
        home: Math.max(...allOdds.map(o => o.home)),
        draw: Math.max(...allOdds.map(o => o.draw)),
        away: Math.max(...allOdds.map(o => o.away)),
        over25: Math.max(...allOdds.map(o => o.over25)),
        under25: Math.max(...allOdds.map(o => o.under25)),
        bttsYes: Math.max(...allOdds.map(o => o.bttsYes)),
        bttsNo: Math.max(...allOdds.map(o => o.bttsNo)),
      };

      // Detectar valor
      const valueBets: ValuePick[] = [];
      
      // 1X2
      if (modelProbs.home > (1/bestOdds.home) + 0.05) {
        valueBets.push(createValuePick(`${home} vs ${away}`, '1X2', home, modelProbs.home, bestOdds.home, i));
      }
      if (modelProbs.away > (1/bestOdds.away) + 0.05) {
        valueBets.push(createValuePick(`${home} vs ${away}`, '1X2', away, modelProbs.away, bestOdds.away, i));
      }
      
      // Over/Under
      if (modelProbs.over25 > (1/bestOdds.over25) + 0.05) {
        valueBets.push(createValuePick(`${home} vs ${away}`, 'Over/Under 2.5', 'Over 2.5', modelProbs.over25, bestOdds.over25, i));
      }
      
      // BTTS
      if (modelProbs.btts > (1/bestOdds.bttsYes) + 0.05) {
        valueBets.push(createValuePick(`${home} vs ${away}`, 'BTTS', 'Sí', modelProbs.btts, bestOdds.bttsYes, i));
      }

      return {
        id: `match-${i}`,
        league: leagues[i % leagues.length],
        time: `${18 + (i % 5)}:00`,
        homeTeam: home,
        awayTeam: away,
        homeForm: 'WWDLW',
        awayForm: 'LDWWD',
        modelProbs,
        bestOdds,
        allOdds,
        valueBets,
        confidence: valueBets.length > 0 ? 8 : 5
      };
    });
  };

  const createValuePick = (match: string, market: string, selection: string, prob: number, odds: number, index: number): ValuePick => {
    const implied = 1 / odds;
    const edge = prob - implied;
    return {
      id: `pick-${index}-${market}`,
      matchId: match,
      market,
      selection,
      modelProb: prob,
      bestOdds: odds,
      impliedProb: implied,
      edge,
      stake: edge > 0.08 ? '3%' : edge > 0.05 ? '2%' : '1%',
      confidence: edge > 0.08 ? 'HIGH' : edge > 0.05 ? 'MEDIUM' : 'LOW'
    };
  };

  const generateParlays = (matches: MatchWithOdds[]): ParlaySuggestion[] => {
    const allPicks = matches.flatMap(m => m.valueBets);
    const parlays: ParlaySuggestion[] = [];

    if (allPicks.length >= 2) {
      // Parlay SAFE - picks con alta probabilidad
      const safePicks = allPicks
        .filter(p => p.modelProb > 0.60 && p.edge > 0.04)
        .slice(0, 3);
      
      if (safePicks.length >= 2) {
        const odds = safePicks.reduce((acc, p) => acc * p.bestOdds, 1);
        const prob = safePicks.reduce((acc, p) => acc * p.modelProb, 1);
        parlays.push({
          id: 'parlay-safe',
          type: 'SAFE',
          picks: safePicks,
          totalOdds: odds,
          expectedValue: (prob * odds) - 1,
          winProbability: prob * 100,
          description: 'Combinación de picks con alta probabilidad de acierto'
        });
      }

      // Parlay VALUE - mejor edge
      const valuePicks = allPicks
        .sort((a, b) => b.edge - a.edge)
        .slice(0, 3);

      if (valuePicks.length >= 2) {
        const odds = valuePicks.reduce((acc, p) => acc * p.bestOdds, 1);
        const prob = valuePicks.reduce((acc, p) => acc * p.modelProb, 1);
        parlays.push({
          id: 'parlay-value',
          type: 'VALUE',
          picks: valuePicks,
          totalOdds: odds,
          expectedValue: (prob * odds) - 1,
          winProbability: prob * 100,
          description: 'Máximo valor combinando los mejores edges'
        });
      }

      // Parlay HIGH ODDS - picks con odds altas pero valor
      const highOddsPicks = allPicks
        .filter(p => p.bestOdds > 2.0 && p.edge > 0.03)
        .slice(0, 2);

      if (highOddsPicks.length >= 2) {
        const odds = highOddsPicks.reduce((acc, p) => acc * p.bestOdds, 1);
        const prob = highOddsPicks.reduce((acc, p) => acc * p.modelProb, 1);
        parlays.push({
          id: 'parlay-high',
          type: 'HIGH_ODDS',
          picks: highOddsPicks,
          totalOdds: odds,
          expectedValue: (prob * odds) - 1,
          winProbability: prob * 100,
          description: 'Mayor retorno potencial con odds elevadas'
        });
      }
    }

    return parlays;
  };

  const addToCart = (pick: ValuePick) => {
    if (!cart.find(p => p.id === pick.id)) {
      setCart([...cart, pick]);
    }
  };

  const removeFromCart = (pickId: string) => {
    setCart(cart.filter(p => p.id !== pickId));
  };

  const cartOdds = cart.reduce((acc, p) => acc * p.bestOdds, 1);
  const cartProbability = cart.reduce((acc, p) => acc * p.modelProb, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Cargando líneas y probabilidades...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Centro de Apuestas</h1>
        <p className="text-slate-400">Líneas en tiempo real + Detección de valor + Parlays sugeridos</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="matches">
            <TrendingUp className="w-4 h-4 mr-2" />
            Partidos con Valor
          </TabsTrigger>
          <TabsTrigger value="parlays">
            <Zap className="w-4 h-4 mr-2" />
            Parlays Sugeridos
          </TabsTrigger>
          <TabsTrigger value="cart">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Mi Parlay ({cart.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Partidos */}
        <TabsContent value="matches">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista de partidos */}
            <div className="lg:col-span-2 space-y-4">
              {matches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onAddToCart={addToCart}
                  cart={cart}
                />
              ))}
            </div>

            {/* Sidebar con picks destacados */}
            <div className="space-y-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Mejores Picks Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {matches
                    .flatMap(m => m.valueBets)
                    .sort((a, b) => b.edge - a.edge)
                    .slice(0, 5)
                    .map(pick => (
                      <div key={pick.id} className="p-3 bg-slate-800 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-white">{pick.matchId}</span>
                          <Badge className={cn(
                            pick.confidence === 'HIGH' ? 'bg-green-600' :
                            pick.confidence === 'MEDIUM' ? 'bg-yellow-600' : 'bg-slate-600'
                          )}>
                            {pick.confidence}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-400 mb-1">
                          {pick.market}: <span className="text-white">{pick.selection}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 font-bold">@{pick.bestOdds}</span>
                          <span className="text-sm text-green-400">+{(pick.edge * 100).toFixed(1)}% edge</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => addToCart(pick)}
                          disabled={cart.find(p => p.id === pick.id) !== undefined}
                        >
                          {cart.find(p => p.id === pick.id) ? 'En Parlay' : 'Agregar'}
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Parlays */}
        <TabsContent value="parlays">
          <div className="grid md:grid-cols-3 gap-6">
            {parlays.map(parlay => (
              <ParlayCard 
                key={parlay.id} 
                parlay={parlay}
                onUseParlay={() => setCart(parlay.picks)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Tab: Carrito */}
        <TabsContent value="cart">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Tu Parlay ({cart.length} selecciones)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Agrega picks desde la pestaña "Partidos"</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {cart.map(pick => (
                        <div key={pick.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                          <div>
                            <p className="font-medium text-white">{pick.matchId}</p>
                            <p className="text-sm text-slate-400">{pick.market}: {pick.selection}</p>
                            <p className="text-sm text-green-400">@{pick.bestOdds} (+{(pick.edge * 100).toFixed(1)}%)</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFromCart(pick.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-800 pt-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Cuota Total</p>
                          <p className="text-2xl font-bold text-white">{cartOdds.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Prob. Modelo</p>
                          <p className="text-2xl font-bold text-blue-400">{(cartProbability * 100).toFixed(1)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-400">EV</p>
                          <p className={cn(
                            "text-2xl font-bold",
                            (cartProbability * cartOdds - 1) > 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {((cartProbability * cartOdds - 1) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-800 rounded-lg p-4 mb-4">
                        <p className="text-sm text-slate-400 mb-2">Posible ganancia con $100:</p>
                        <p className="text-3xl font-bold text-green-400">${(100 * cartOdds).toFixed(2)}</p>
                      </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const text = cart.map(p => `${p.matchId}: ${p.selection} @${p.bestOdds}`).join('\n') + 
                          `\n\nCuota Total: ${cartOdds.toFixed(2)}`;
                        navigator.clipboard.writeText(text);
                        alert('Parlay copiado al portapapeles');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Parlay
                    </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchCard({ match, onAddToCart, cart }: { 
  match: MatchWithOdds; 
  onAddToCart: (pick: ValuePick) => void;
  cart: ValuePick[];
}) {
  const [showOdds, setShowOdds] = useState(false);

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800",
      match.valueBets.length > 0 && "border-l-4 border-l-green-500"
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <Badge variant="outline" className="mb-2">{match.league}</Badge>
            <p className="text-sm text-slate-400">{match.time}</p>
          </div>
          {match.valueBets.length > 0 && (
            <Badge className="bg-green-600">
              <Zap className="w-3 h-3 mr-1" />
              {match.valueBets.length} picks valor
            </Badge>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-xl font-bold text-white">{match.homeTeam}</p>
            <p className="text-xs text-slate-500">Forma: {match.homeForm}</p>
          </div>
          <div className="px-4 text-center">
            <span className="text-slate-500">VS</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xl font-bold text-white">{match.awayTeam}</p>
            <p className="text-xs text-slate-500">Forma: {match.awayForm}</p>
          </div>
        </div>

        {/* Odds Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <OddsBox 
            label="1" 
            odds={match.bestOdds.home}
            prob={match.modelProbs.home}
            isValue={match.modelProbs.home > (1/match.bestOdds.home) + 0.05}
          />
          <OddsBox 
            label="X" 
            odds={match.bestOdds.draw}
            prob={match.modelProbs.draw}
            isValue={match.modelProbs.draw > (1/match.bestOdds.draw) + 0.05}
          />
          <OddsBox 
            label="2" 
            odds={match.bestOdds.away}
            prob={match.modelProbs.away}
            isValue={match.modelProbs.away > (1/match.bestOdds.away) + 0.05}
          />
        </div>

        {/* Mercados adicionales */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <OddsBox 
            label="Over 2.5" 
            odds={match.bestOdds.over25}
            prob={match.modelProbs.over25}
            isValue={match.modelProbs.over25 > (1/match.bestOdds.over25) + 0.05}
            small
          />
          <OddsBox 
            label="BTTS Sí" 
            odds={match.bestOdds.bttsYes}
            prob={match.modelProbs.btts}
            isValue={match.modelProbs.btts > (1/match.bestOdds.bttsYes) + 0.05}
            small
          />
        </div>

        {/* Value Picks del partido */}
        {match.valueBets.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-sm font-medium text-white mb-2">Picks con valor:</p>
            <div className="space-y-2">
              {match.valueBets.map(pick => (
                <div key={pick.id} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{pick.market}</span>
                    <span className="text-slate-400">{pick.selection}</span>
                    <Badge className="bg-green-600 text-xs">@{pick.bestOdds}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-400">+{(pick.edge * 100).toFixed(1)}%</span>
                    <span className="text-sm text-slate-400">Stake {pick.stake}</span>
                    <Button 
                      size="sm" 
                      className="h-7"
                      onClick={() => onAddToCart(pick)}
                      disabled={cart.find(p => p.id === pick.id) !== undefined}
                    >
                      {cart.find(p => p.id === pick.id) ? '✓' : '+'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OddsBox({ label, odds, prob, isValue, small = false }: {
  label: string;
  odds: number;
  prob: number;
  isValue: boolean;
  small?: boolean;
}) {
  const implied = 1 / odds;
  const edge = prob - implied;

  return (
    <div className={cn(
      "relative rounded-lg p-2 text-center border",
      isValue 
        ? "bg-green-500/10 border-green-500/50" 
        : "bg-slate-800 border-slate-700",
      small ? "text-xs" : ""
    )}>
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={cn(
        "font-bold",
        isValue ? "text-green-400" : "text-white",
        small ? "text-sm" : "text-lg"
      )}>
        {odds.toFixed(2)}
      </p>
      {isValue && (
        <p className="text-xs text-green-400">+{(edge * 100).toFixed(0)}%</p>
      )}
    </div>
  );
}

function ParlayCard({ parlay, onUseParlay }: {
  parlay: ParlaySuggestion;
  onUseParlay: () => void;
}) {
  const colors = {
    SAFE: 'bg-blue-600',
    VALUE: 'bg-green-600',
    HIGH_ODDS: 'bg-purple-600'
  };

  const labels = {
    SAFE: 'Seguro',
    VALUE: 'Máximo Valor',
    HIGH_ODDS: 'Alto Retorno'
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Badge className={colors[parlay.type]}>{labels[parlay.type]}</Badge>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{parlay.totalOdds.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Cuota Total</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">{parlay.description}</p>

        <div className="space-y-2">
          {parlay.picks.map((pick, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-slate-800 rounded-lg">
              <div className="text-sm">
                <p className="text-white">{pick.matchId}</p>
                <p className="text-slate-400">{pick.market}: {pick.selection}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">@{pick.bestOdds}</p>
                <p className="text-xs text-green-400">+{(pick.edge * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-400">Prob. de Ganar</p>
            <p className="text-lg font-bold text-blue-400">{parlay.winProbability.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Expected Value</p>
            <p className={cn(
              "text-lg font-bold",
              parlay.expectedValue > 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {(parlay.expectedValue * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={onUseParlay}
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Usar este Parlay
        </Button>
      </CardContent>
    </Card>
  );
}
