import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// Type definitions for API-Football standings response
interface StandingsApiResponse {
  response: Array<{
    league: {
      id: number;
      name: string;
      standings: Array<Array<{
        rank: number;
        team: {
          id: number;
          name: string;
          code: string | null;
          logo: string;
        };
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
          goals: {
            for: number;
            against: number;
          };
        };
        goalsDiff: number;
        points: number;
        form: string | null;
        description: string | null;
      }>>;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Get all leagues from DB
    const leagues = await prisma.league.findMany();
    let synced = 0;
    let errors: string[] = [];

    for (const league of leagues) {
      try {
        // Get standings for this league using the shared service with rate limiting
        const data = await makeRequest<StandingsApiResponse>({
          endpoint: '/standings',
          params: { league: league.id, season: league.season }
        });
        
        if (!data.response || data.response.length === 0) {
          errors.push(`League ${league.id}: No standings data`);
          continue;
        }

        const allStandings = data.response[0].league.standings;
        
        if (!allStandings || !Array.isArray(allStandings) || allStandings.length === 0) {
          errors.push(`League ${league.id}: Invalid standings format`);
          continue;
        }

        // Use the first standings group (handles leagues with multiple phases)
        const standings = allStandings[0];

        for (const teamStanding of standings) {
          const team = teamStanding.team;
          
          // First, upsert the team
          await prisma.team.upsert({
            where: { id: team.id },
            update: {
              name: team.name,
              code: team.code || null,
              country: league.country,
              logo: team.logo || null,
            },
            create: {
              id: team.id,
              name: team.name,
              code: team.code || null,
              country: league.country,
              logo: team.logo || null,
            },
          });

          // Then upsert the standing
          await prisma.standing.upsert({
            where: {
              leagueId_teamId_season: {
                leagueId: league.id,
                teamId: team.id,
                season: league.season,
              },
            },
            update: {
              rank: teamStanding.rank,
              played: teamStanding.all.played,
              won: teamStanding.all.win,
              drawn: teamStanding.all.draw,
              lost: teamStanding.all.lose,
              goalsFor: teamStanding.all.goals.for,
              goalsAgainst: teamStanding.all.goals.against,
              goalDiff: teamStanding.goalsDiff,
              points: teamStanding.points,
              form: teamStanding.form || null,
              description: teamStanding.description || null,
            },
            create: {
              leagueId: league.id,
              teamId: team.id,
              season: league.season,
              rank: teamStanding.rank,
              played: teamStanding.all.played,
              won: teamStanding.all.win,
              drawn: teamStanding.all.draw,
              lost: teamStanding.all.lose,
              goalsFor: teamStanding.all.goals.for,
              goalsAgainst: teamStanding.all.goals.against,
              goalDiff: teamStanding.goalsDiff,
              points: teamStanding.points,
              form: teamStanding.form || null,
              description: teamStanding.description || null,
            },
          });
        }

        synced++;
        
        // Rate limiting is handled by makeRequest service
        
      } catch (error: any) {
        errors.push(`League ${league.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      total: leagues.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to sync standings from API-Football for all leagues',
  });
}
