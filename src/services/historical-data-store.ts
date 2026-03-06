// Historical Data Store
// Indexa y almacena datos de partidos históricos para acceso rápido

export interface HistoricalMatch {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
    venue?: {
      id: number;
      name: string;
      city: string;
    };
    referee?: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round?: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo?: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo?: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  };
  estadisticas?: any[];
}

// Estructura de índices para búsqueda rápida
class HistoricalDataStore {
  private matches: HistoricalMatch[] = [];
  private matchesById: Map<number, HistoricalMatch> = new Map();
  private matchesByLeague: Map<number, HistoricalMatch[]> = new Map();
  private matchesByTeam: Map<number, HistoricalMatch[]> = new Map();
  private matchesBySeason: Map<string, HistoricalMatch[]> = new Map(); // key: "leagueId:season"
  private isLoaded = false;
  private loadProgress = 0;

  // Cargar datos desde múltiples archivos JSON
  async loadFromFiles(fileList: { leagueId: number; data: HistoricalMatch[] }[]): Promise<void> {
    console.log(`[HistoricalData] Loading ${fileList.length} league files...`);
    
    this.matches = [];
    this.matchesById.clear();
    this.matchesByLeague.clear();
    this.matchesByTeam.clear();
    this.matchesBySeason.clear();

    for (let i = 0; i < fileList.length; i++) {
      const { leagueId, data } = fileList[i];
      
      if (!Array.isArray(data)) {
        console.warn(`[HistoricalData] File for league ${leagueId} is not an array`);
        continue;
      }

      // Procesar cada partido
      data.forEach((match: any) => {
        if (!match.fixture || !match.teams) return;
        
        const normalizedMatch: HistoricalMatch = {
          fixture: {
            id: match.fixture.id,
            date: match.fixture.date,
            timestamp: match.fixture.timestamp,
            status: {
              long: match.fixture.status?.long || 'Match Finished',
              short: match.fixture.status?.short || 'FT',
              elapsed: match.fixture.status?.elapsed || 90,
            },
            venue: match.fixture.venue,
            referee: match.fixture.referee,
          },
          league: {
            id: match.league?.id || leagueId,
            name: match.league?.name || '',
            country: match.league?.country || '',
            season: match.league?.season || this.extractSeason(match.fixture.date),
            round: match.league?.round,
          },
          teams: {
            home: {
              id: match.teams?.home?.id || 0,
              name: match.teams?.home?.name || 'Unknown',
              logo: match.teams?.home?.logo,
              winner: match.teams?.home?.winner,
            },
            away: {
              id: match.teams?.away?.id || 0,
              name: match.teams?.away?.name || 'Unknown',
              logo: match.teams?.away?.logo,
              winner: match.teams?.away?.winner,
            },
          },
          goals: {
            home: match.goals?.home ?? null,
            away: match.goals?.away ?? null,
          },
          score: match.score || {},
          estadisticas: match.estadisticas,
        };

        this.matches.push(normalizedMatch);
        
        // Indexar por ID
        this.matchesById.set(normalizedMatch.fixture.id, normalizedMatch);
        
        // Indexar por liga
        const leagueMatches = this.matchesByLeague.get(normalizedMatch.league.id) || [];
        leagueMatches.push(normalizedMatch);
        this.matchesByLeague.set(normalizedMatch.league.id, leagueMatches);
        
        // Indexar por equipo (home y away)
        const homeMatches = this.matchesByTeam.get(normalizedMatch.teams.home.id) || [];
        homeMatches.push(normalizedMatch);
        this.matchesByTeam.set(normalizedMatch.teams.home.id, homeMatches);
        
        const awayMatches = this.matchesByTeam.get(normalizedMatch.teams.away.id) || [];
        awayMatches.push(normalizedMatch);
        this.matchesByTeam.set(normalizedMatch.teams.away.id, awayMatches);
        
        // Indexar por temporada
        const seasonKey = `${normalizedMatch.league.id}:${normalizedMatch.league.season}`;
        const seasonMatches = this.matchesBySeason.get(seasonKey) || [];
        seasonMatches.push(normalizedMatch);
        this.matchesBySeason.set(seasonKey, seasonMatches);
      });

      this.loadProgress = Math.round(((i + 1) / fileList.length) * 100);
    }

    this.isLoaded = true;
    console.log(`[HistoricalData] Loaded ${this.matches.length} total matches`);
    console.log(`[HistoricalData] ${this.matchesByLeague.size} leagues, ${this.matchesByTeam.size} teams`);
  }

  // Extraer temporada de la fecha
  private extractSeason(dateStr: string): number {
    if (!dateStr) return new Date().getFullYear();
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return month >= 8 ? year : year - 1;
  }

  // Obtener partidos de un equipo (últimos N)
  getTeamMatches(teamId: number, limit = 10): HistoricalMatch[] {
    const matches = this.matchesByTeam.get(teamId) || [];
    return matches
      .filter(m => m.fixture.status.short === 'FT') // Solo partidos finalizados
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
      .slice(0, limit);
  }

  // Obtener partidos de un equipo en una liga específica
  getTeamMatchesInLeague(teamId: number, leagueId: number, limit = 10): HistoricalMatch[] {
    const matches = this.matchesByTeam.get(teamId) || [];
    return matches
      .filter(m => m.league.id === leagueId && m.fixture.status.short === 'FT')
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
      .slice(0, limit);
  }

  // Obtener H2H entre dos equipos
  getH2H(team1Id: number, team2Id: number, limit = 10): HistoricalMatch[] {
    const team1Matches = this.matchesByTeam.get(team1Id) || [];
    return team1Matches
      .filter(m => 
        (m.teams.home.id === team1Id && m.teams.away.id === team2Id) ||
        (m.teams.home.id === team2Id && m.teams.away.id === team1Id)
      )
      .filter(m => m.fixture.status.short === 'FT')
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
      .slice(0, limit);
  }

  // Obtener partidos de una liga
  getLeagueMatches(leagueId: number, season?: number, limit?: number): HistoricalMatch[] {
    let matches = this.matchesByLeague.get(leagueId) || [];
    
    if (season) {
      const seasonKey = `${leagueId}:${season}`;
      matches = this.matchesBySeason.get(seasonKey) || [];
    }
    
    matches = matches
      .filter(m => m.fixture.status.short === 'FT')
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp);
    
    return limit ? matches.slice(0, limit) : matches;
  }

  // Calcular standings de una liga/temporada
  calculateStandings(leagueId: number, season: number): TeamStanding[] {
    const matches = this.getLeagueMatches(leagueId, season);
    const standings = new Map<number, TeamStanding>();

    matches.forEach(match => {
      const homeId = match.teams.home.id;
      const awayId = match.teams.away.id;
      const homeGoals = match.goals.home ?? 0;
      const awayGoals = match.goals.away ?? 0;

      // Inicializar equipos si no existen
      if (!standings.has(homeId)) {
        standings.set(homeId, this.createEmptyStanding(homeId, match.teams.home.name, match.teams.home.logo));
      }
      if (!standings.has(awayId)) {
        standings.set(awayId, this.createEmptyStanding(awayId, match.teams.away.name, match.teams.away.logo));
      }

      const home = standings.get(homeId)!;
      const away = standings.get(awayId)!;

      // Actualizar estadísticas
      home.played++;
      away.played++;
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;
      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (homeGoals < awayGoals) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }
    });

    // Convertir a array y ordenar
    return Array.from(standings.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      })
      .map((team, index) => ({ ...team, position: index + 1 }));
  }

  private createEmptyStanding(id: number, name: string, logo?: string): TeamStanding {
    return {
      id,
      name,
      logo,
      position: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  // Calcular forma de un equipo (últimos 5 partidos)
  calculateForm(teamId: number, leagueId?: number): FormResult[] {
    const matches = leagueId 
      ? this.getTeamMatchesInLeague(teamId, leagueId, 5)
      : this.getTeamMatches(teamId, 5);

    return matches.map(match => {
      const isHome = match.teams.home.id === teamId;
      const teamGoals = isHome ? (match.goals.home ?? 0) : (match.goals.away ?? 0);
      const opponentGoals = isHome ? (match.goals.away ?? 0) : (match.goals.home ?? 0);
      const opponent = isHome ? match.teams.away : match.teams.home;

      let result: 'W' | 'D' | 'L';
      if (teamGoals > opponentGoals) result = 'W';
      else if (teamGoals < opponentGoals) result = 'L';
      else result = 'D';

      return {
        matchId: match.fixture.id,
        date: match.fixture.date,
        result,
        goalsFor: teamGoals,
        goalsAgainst: opponentGoals,
        isHome,
        opponent: opponent.name,
        opponentId: opponent.id,
      };
    }).reverse(); // Más antiguo primero
  }

  // Estadísticas de un equipo en una temporada
  getTeamStats(teamId: number, leagueId: number, season: number): TeamStats | null {
    const matches = this.getLeagueMatches(leagueId, season)
      .filter(m => m.teams.home.id === teamId || m.teams.away.id === teamId);

    if (matches.length === 0) return null;

    const homeMatches = matches.filter(m => m.teams.home.id === teamId);
    const awayMatches = matches.filter(m => m.teams.away.id === teamId);

    const homeStats = this.calculateMatchStats(homeMatches, true);
    const awayStats = this.calculateMatchStats(awayMatches, false);

    return {
      teamId,
      leagueId,
      season,
      matchesPlayed: matches.length,
      home: homeStats,
      away: awayStats,
      total: {
        played: matches.length,
        wins: homeStats.wins + awayStats.wins,
        draws: homeStats.draws + awayStats.draws,
        losses: homeStats.losses + awayStats.losses,
        goalsFor: homeStats.goalsFor + awayStats.goalsFor,
        goalsAgainst: homeStats.goalsAgainst + awayStats.goalsAgainst,
        goalDifference: (homeStats.goalsFor + awayStats.goalsFor) - (homeStats.goalsAgainst + awayStats.goalsAgainst),
        cleanSheets: homeStats.cleanSheets + awayStats.cleanSheets,
        failedToScore: homeStats.failedToScore + awayStats.failedToScore,
      },
    };
  }

  private calculateMatchStats(matches: HistoricalMatch[], isHome: boolean): MatchStats {
    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let cleanSheets = 0, failedToScore = 0;

    matches.forEach(match => {
      const teamGoals = isHome ? (match.goals.home ?? 0) : (match.goals.away ?? 0);
      const oppGoals = isHome ? (match.goals.away ?? 0) : (match.goals.home ?? 0);

      goalsFor += teamGoals;
      goalsAgainst += oppGoals;

      if (teamGoals > oppGoals) wins++;
      else if (teamGoals < oppGoals) losses++;
      else draws++;

      if (oppGoals === 0) cleanSheets++;
      if (teamGoals === 0) failedToScore++;
    });

    return {
      played: matches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets,
      failedToScore,
    };
  }

  // Verificar si hay datos cargados
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  // Obtener progreso de carga
  getLoadProgress(): number {
    return this.loadProgress;
  }

  // Obtener resumen de datos
  getSummary(): {
    totalMatches: number;
    totalLeagues: number;
    totalTeams: number;
    seasons: number[];
  } {
    const seasons = new Set<number>();
    this.matches.forEach(m => seasons.add(m.league.season));

    return {
      totalMatches: this.matches.length,
      totalLeagues: this.matchesByLeague.size,
      totalTeams: this.matchesByTeam.size,
      seasons: Array.from(seasons).sort(),
    };
  }

  // Limpiar todos los datos
  clear(): void {
    this.matches = [];
    this.matchesById.clear();
    this.matchesByLeague.clear();
    this.matchesByTeam.clear();
    this.matchesBySeason.clear();
    this.isLoaded = false;
    this.loadProgress = 0;
    console.log('[HistoricalData] Data cleared');
  }
}

// Interfaces auxiliares
export interface TeamStanding {
  id: number;
  name: string;
  logo?: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface FormResult {
  matchId: number;
  date: string;
  result: 'W' | 'D' | 'L';
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  opponent: string;
  opponentId: number;
}

export interface MatchStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
}

export interface TeamStats {
  teamId: number;
  leagueId: number;
  season: number;
  matchesPlayed: number;
  home: MatchStats;
  away: MatchStats;
  total: MatchStats;
}

// Singleton instance
export const historicalData = new HistoricalDataStore();
export default historicalData;
