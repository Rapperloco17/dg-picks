// Local Data Adapter
// Adapta los datos locales al formato que esperan los componentes
// Usa datos locales primero, API como fallback
// Para temporada actual, usa API si los datos locales están desactualizados

import { historicalData } from './historical-data-store';
import { makeRequest } from './api-football';
import { hasLocalData, loadLeaguesLazy } from './local-data-loader';
import { checkDataFreshness, shouldUseApiForMatch, getBestDataStrategy } from './smart-data-selector';

// Interfaces compatibles con match-stats-cached.ts
export interface MatchForm {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string;
  last10: Array<{
    date: string;
    opponent: string;
    home: boolean;
    result: 'W' | 'D' | 'L';
    goalsFor: number;
    goalsAgainst: number;
  }>;
}

export interface TeamDetailedStats {
  leaguePosition: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
  cleanSheets: number;
  failedToScore: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  cards: { yellow: number; red: number };
  corners: { for: number; against: number };
}

export interface H2HStats {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  avgGoals: number;
  over25: number;
  btts: number;
  last5: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    league: string;
  }>;
}

// Obtener forma de un equipo (últimos 10 partidos)
export async function getTeamFormLocal(
  teamId: number, 
  leagueId?: number
): Promise<MatchForm | null> {
  // Si tenemos datos locales, usarlos
  if (historicalData.isDataLoaded()) {
    const formResults = historicalData.calculateForm(teamId, leagueId);
    
    if (formResults.length === 0) {
      return null;
    }

    const stats = {
      played: formResults.length,
      wins: formResults.filter(r => r.result === 'W').length,
      draws: formResults.filter(r => r.result === 'D').length,
      losses: formResults.filter(r => r.result === 'L').length,
      goalsFor: formResults.reduce((sum, r) => sum + r.goalsFor, 0),
      goalsAgainst: formResults.reduce((sum, r) => sum + r.goalsAgainst, 0),
    };

    const formString = formResults.map(r => r.result).join('');

    return {
      ...stats,
      form: formString,
      last10: formResults.map(r => ({
        date: r.date,
        opponent: r.opponent,
        home: r.isHome,
        result: r.result,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
      })),
    };
  }

  // Si no hay datos locales pero la liga está disponible, cargarla
  if (leagueId && hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
    return getTeamFormLocal(teamId, leagueId); // Reintentar
  }

  return null;
}

// Obtener estadísticas detalladas de un equipo
export async function getTeamStatsLocal(
  teamId: number,
  leagueId: number,
  season: number
): Promise<TeamDetailedStats | null> {
  if (historicalData.isDataLoaded()) {
    const stats = historicalData.getTeamStats(teamId, leagueId, season);
    
    if (!stats) {
      return null;
    }

    // Calcular tabla de posiciones para obtener la posición del equipo
    const standings = historicalData.calculateStandings(leagueId, season);
    const teamStanding = standings.find(s => s.id === teamId);

    // Calcular métricas adicionales
    const matches = historicalData.getLeagueMatches(leagueId, season)
      .filter(m => m.teams.home.id === teamId || m.teams.away.id === teamId);

    let over15Count = 0;
    let over25Count = 0;
    let over35Count = 0;
    let bttsCount = 0;

    matches.forEach(m => {
      const totalGoals = (m.goals.home ?? 0) + (m.goals.away ?? 0);
      if (totalGoals > 1.5) over15Count++;
      if (totalGoals > 2.5) over25Count++;
      if (totalGoals > 3.5) over35Count++;
      if ((m.goals.home ?? 0) > 0 && (m.goals.away ?? 0) > 0) bttsCount++;
    });

    const played = stats.total.played;

    return {
      leaguePosition: teamStanding?.position || 0,
      points: teamStanding?.points || 0,
      played: stats.total.played,
      won: stats.total.wins,
      drawn: stats.total.draws,
      lost: stats.total.losses,
      goalsFor: stats.total.goalsFor,
      goalsAgainst: stats.total.goalsAgainst,
      goalDifference: stats.total.goalsFor - stats.total.goalsAgainst,
      form: '', // Se calcularía con calculateForm
      cleanSheets: stats.total.cleanSheets,
      failedToScore: stats.total.failedToScore,
      over15: played > 0 ? Math.round((over15Count / played) * 100) : 0,
      over25: played > 0 ? Math.round((over25Count / played) * 100) : 0,
      over35: played > 0 ? Math.round((over35Count / played) * 100) : 0,
      btts: played > 0 ? Math.round((bttsCount / played) * 100) : 0,
      avgGoalsScored: played > 0 ? stats.total.goalsFor / played : 0,
      avgGoalsConceded: played > 0 ? stats.total.goalsAgainst / played : 0,
      cards: { yellow: 0, red: 0 }, // No disponible en datos básicos
      corners: { for: 0, against: 0 }, // No disponible en datos básicos
    };
  }

  if (hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
    return getTeamStatsLocal(teamId, leagueId, season);
  }

  return null;
}

// Obtener H2H entre dos equipos
export async function getH2HLocal(
  team1Id: number,
  team2Id: number,
  leagueId?: number
): Promise<H2HStats | null> {
  if (historicalData.isDataLoaded()) {
    const h2hMatches = historicalData.getH2H(team1Id, team2Id, 50);
    
    if (h2hMatches.length === 0) {
      return null;
    }

    // Filtrar por liga si se especifica
    const filteredMatches = leagueId 
      ? h2hMatches.filter(m => m.league.id === leagueId)
      : h2hMatches;

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    let totalGoals = 0;
    let over25Count = 0;
    let bttsCount = 0;

    filteredMatches.forEach(m => {
      const homeGoals = m.goals.home ?? 0;
      const awayGoals = m.goals.away ?? 0;
      const matchGoals = homeGoals + awayGoals;

      totalGoals += matchGoals;
      if (matchGoals > 2.5) over25Count++;
      if (homeGoals > 0 && awayGoals > 0) bttsCount++;

      if (homeGoals > awayGoals) homeWins++;
      else if (homeGoals < awayGoals) awayWins++;
      else draws++;
    });

    const total = filteredMatches.length;

    return {
      totalMatches: total,
      homeWins,
      draws,
      awayWins,
      avgGoals: total > 0 ? totalGoals / total : 0,
      over25: total > 0 ? Math.round((over25Count / total) * 100) : 0,
      btts: total > 0 ? Math.round((bttsCount / total) * 100) : 0,
      last5: filteredMatches.slice(0, 5).map(m => ({
        date: m.fixture.date,
        homeTeam: m.teams.home.name,
        awayTeam: m.teams.away.name,
        homeGoals: m.goals.home ?? 0,
        awayGoals: m.goals.away ?? 0,
        league: m.league.name,
      })),
    };
  }

  // Si no hay datos locales, intentar cargar la liga
  if (leagueId && hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
    return getH2HLocal(team1Id, team2Id, leagueId);
  }

  return null;
}

// Obtener tabla de posiciones
export async function getStandingsLocal(
  leagueId: number,
  season: number
): Promise<Array<{
  rank: number;
  team: string;
  teamId: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
}> | null> {
  if (historicalData.isDataLoaded()) {
    const standings = historicalData.calculateStandings(leagueId, season);
    
    if (standings.length === 0) {
      return null;
    }

    return standings.map(s => ({
      rank: s.position,
      team: s.name,
      teamId: s.id,
      points: s.points,
      played: s.played,
      wins: s.won,
      draws: s.drawn,
      losses: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalsDiff: s.goalDifference,
    }));
  }

  if (hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
    return getStandingsLocal(leagueId, season);
  }

  return null;
}

// Wrapper inteligente que decide usar locales o API según frescura de datos
export async function getCompleteMatchStatsWithLocal(
  match: { 
    fixture: { id: number; date?: string }; 
    teams: { home: { id: number; name: string }; away: { id: number; name: string } };
    league: { id: number; season: number };
  },
  season?: number
): Promise<{
  homeForm: MatchForm | null;
  awayForm: MatchForm | null;
  homeStats: TeamDetailedStats | null;
  awayStats: TeamDetailedStats | null;
  h2h: H2HStats | null;
  standings: Array<any> | null;
  source: 'local' | 'api' | 'mixed';
  freshness?: {
    daysSinceLastMatch: number;
    isCurrentSeason: boolean;
    recommendedSource: string;
  };
}> {
  const { home, away } = match.teams;
  const leagueId = match.league.id;
  const targetSeason = season || match.league.season;
  const matchDate = match.fixture.date;

  // Verificar frescura de datos
  const freshness = await checkDataFreshness(leagueId, targetSeason);
  
  // Para partidos próximos en temporada actual, verificar si necesitamos API
  const useApi = await shouldUseApiForMatch(matchDate || '', leagueId) || 
                 freshness.recommendedSource === 'api';

  let source: 'local' | 'api' | 'mixed' = useApi ? 'api' : 'local';
  
  let homeForm: MatchForm | null = null;
  let awayForm: MatchForm | null = null;
  let homeStats: TeamDetailedStats | null = null;
  let awayStats: TeamDetailedStats | null = null;
  let h2h: H2HStats | null = null;
  let standings: Array<any> | null = null;

  // Si es temporada actual y datos desactualizados, usar API primero
  if (useApi) {
    console.log(`[SmartData] Usando API para liga ${leagueId} - ${freshness.reason}`);
    
    try {
      // Obtener TODO desde API para asegurar datos frescos
      const [homeApi, awayApi, h2hApi, standingsApi] = await Promise.all([
        // Forma local equipo
        getTeamFormLocal(home.id, leagueId),
        // Forma visitante  
        getTeamFormLocal(away.id, leagueId),
        // H2H local
        getH2HLocal(home.id, away.id, leagueId),
        // Standings local
        getStandingsLocal(leagueId, targetSeason)
      ]);
      
      homeForm = homeApi;
      awayForm = awayApi;
      h2h = h2hApi;
      standings = standingsApi;
      
      // Ahora obtener de API lo que falta o esté desactualizado
      const apiPromises: Promise<void>[] = [];
      
      // Forma desde API si no hay local o está desactualizado
      if (!homeForm || freshness.daysSinceLastMatch > 7) {
        apiPromises.push(
          makeRequest<{
            response: {
              form: string;
              fixtures: { played: { total: number }; wins: { total: number }; draws: { total: number }; loses: { total: number } };
              goals: { for: { total: number }; against: { total: number } };
            };
          }>({
            endpoint: '/teams/statistics',
            params: { league: leagueId, season: targetSeason, team: home.id }
          }).then(apiForm => {
            if (apiForm?.response) {
              homeForm = transformApiForm(apiForm.response);
            }
          }).catch(() => {})
        );
      }
      
      if (!awayForm || freshness.daysSinceLastMatch > 7) {
        apiPromises.push(
          makeRequest<{
            response: {
              form: string;
              fixtures: { played: { total: number }; wins: { total: number }; draws: { total: number }; loses: { total: number } };
              goals: { for: { total: number }; against: { total: number } };
            };
          }>({
            endpoint: '/teams/statistics',
            params: { league: leagueId, season: targetSeason, team: away.id }
          }).then(apiForm => {
            if (apiForm?.response) {
              awayForm = transformApiForm(apiForm.response);
            }
          }).catch(() => {})
        );
      }
      
      // Standings SIEMPRE desde API para temporada actual (cambian cada semana)
      apiPromises.push(
        makeRequest<{
          response: Array<{
            league: {
              standings: Array<Array<{
                rank: number;
                team: { name: string; id: number };
                points: number;
                all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
                goalsDiff: number;
              }>>;
            };
          }>;
        }>({
          endpoint: '/standings',
          params: { league: leagueId, season: targetSeason }
        }).then(apiStandings => {
          if (apiStandings?.response?.[0]?.league?.standings?.[0]) {
            standings = transformApiStandings(apiStandings.response[0].league.standings[0]);
          }
        }).catch(() => {})
      );
      
      // H2H desde API si no hay local
      if (!h2h) {
        apiPromises.push(
          makeRequest<{
            response: Array<{
              fixture: { date: string };
              teams: { home: { name: string }; away: { name: string } };
              goals: { home: number; away: number };
              league: { name: string };
            }>;
          }>({
            endpoint: '/fixtures/headtohead',
            params: { h2h: `${home.id}-${away.id}` }
          }).then(apiH2H => {
            if (apiH2H?.response) {
              h2h = transformApiH2H(apiH2H.response);
            }
          }).catch(() => {})
        );
      }
      
      await Promise.all(apiPromises);
      
      source = 'mixed';
      
    } catch (error) {
      console.warn('[SmartData] Error usando API, fallback a locales:', error);
      // Fallback a locales
      source = 'local';
    }
  }
  
  // Si no usamos API o falló, obtener locales
  if (source === 'local' || (!homeForm && !awayForm)) {
    console.log(`[SmartData] Usando datos locales para liga ${leagueId}`);
    
    [homeForm, awayForm, homeStats, awayStats, h2h, standings] = await Promise.all([
      getTeamFormLocal(home.id, leagueId),
      getTeamFormLocal(away.id, leagueId),
      getTeamStatsLocal(home.id, leagueId, targetSeason),
      getTeamStatsLocal(away.id, leagueId, targetSeason),
      getH2HLocal(home.id, away.id, leagueId),
      getStandingsLocal(leagueId, targetSeason)
    ]);
  }

  return {
    homeForm,
    awayForm,
    homeStats,
    awayStats,
    h2h,
    standings,
    source,
    freshness: {
      daysSinceLastMatch: freshness.daysSinceLastMatch,
      isCurrentSeason: freshness.isCurrentSeason,
      recommendedSource: freshness.recommendedSource,
    }
  };
}

// Transformar forma de API al formato local
function transformApiForm(apiStats: any): MatchForm {
  const form = apiStats.form || '';
  const fixtures = apiStats.fixtures || {};
  const goals = apiStats.goals || {};

  return {
    played: fixtures.played?.total || 0,
    wins: fixtures.wins?.total || 0,
    draws: fixtures.draws?.total || 0,
    losses: fixtures.loses?.total || 0,
    goalsFor: goals.for?.total || 0,
    goalsAgainst: goals.against?.total || 0,
    form: form.slice(-5),
    last10: [], // La API no devuelve detalle de últimos partidos en este endpoint
  };
}

// Transformar H2H de API al formato local
function transformApiH2H(apiH2H: any[]): H2HStats {
  const matches = apiH2H.filter(m => m.fixture?.status?.short === 'FT');
  
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalGoals = 0;
  let over25Count = 0;
  let bttsCount = 0;

  matches.forEach(m => {
    const homeGoals = m.goals?.home ?? 0;
    const awayGoals = m.goals?.away ?? 0;
    const matchGoals = homeGoals + awayGoals;

    totalGoals += matchGoals;
    if (matchGoals > 2.5) over25Count++;
    if (homeGoals > 0 && awayGoals > 0) bttsCount++;

    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals < awayGoals) awayWins++;
    else draws++;
  });

  const total = matches.length;

  return {
    totalMatches: total,
    homeWins,
    draws,
    awayWins,
    avgGoals: total > 0 ? totalGoals / total : 0,
    over25: total > 0 ? Math.round((over25Count / total) * 100) : 0,
    btts: total > 0 ? Math.round((bttsCount / total) * 100) : 0,
    last5: matches.slice(0, 5).map(m => ({
      date: m.fixture?.date,
      homeTeam: m.teams?.home?.name,
      awayTeam: m.teams?.away?.name,
      homeGoals: m.goals?.home ?? 0,
      awayGoals: m.goals?.away ?? 0,
      league: m.league?.name,
    })),
  };
}

// Transformar standings de API al formato local
function transformApiStandings(apiStandings: any[]): any[] {
  return apiStandings.map((s, index) => ({
    rank: s.rank || index + 1,
    team: s.team?.name,
    teamId: s.team?.id,
    points: s.points,
    played: s.all?.played,
    wins: s.all?.win,
    draws: s.all?.draw,
    losses: s.all?.lose,
    goalsFor: s.all?.goals?.for,
    goalsAgainst: s.all?.goals?.against,
    goalsDiff: s.goalsDiff,
  }));
}
