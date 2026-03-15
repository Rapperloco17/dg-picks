import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'FOOTBALL_API_KEY not set' }, { status: 500 });
    }

    // Get all leagues from DB
    const leagues = await prisma.league.findMany();
    let synced = 0;
    let errors: string[] = [];

    for (const league of leagues) {
      try {
        // Get standings for this league
        const response = await fetch(
          `${API_BASE}/standings?league=${league.id}&season=${league.season}`,
          {
            headers: {
              'x-rapidapi-key': API_KEY,
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        );

        const data = await response.json();
        
        if (!data.response || data.response.length === 0) {
          errors.push(`League ${league.id}: No standings data`);
          continue;
        }

        const standings = data.response[0].league.standings[0];
        
        if (!standings || !Array.isArray(standings)) {
          errors.push(`League ${league.id}: Invalid standings format`);
          continue;
        }

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
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
