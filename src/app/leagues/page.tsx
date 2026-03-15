import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Función para obtener ligas desde la base de datos
async function getLeagues() {
  try {
    const leagues = await prisma.league.findMany({
      orderBy: [
        { country: 'asc' },
        { name: 'asc' },
      ],
    });
    return leagues;
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

// Mapeo de países a emojis de banderas
const countryFlags: Record<string, string> = {
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',
  'Portugal': '🇵🇹',
  'Turkey': '🇹🇷',
  'Belgium': '🇧🇪',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Poland': '🇵🇱',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Mexico': '🇲🇽',
  'Argentina': '🇦🇷',
  'Brazil': '🇧🇷',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Europe': '🇪🇺',
};

function getFlag(country: string) {
  return countryFlags[country] || '🏆';
}

export default async function LeaguesPage() {
  const leagues = await getLeagues();

  // Separar ligas top (las 10 primeras) del resto
  const topLeaguesList = leagues.slice(0, 10);
  const otherLeagues = leagues.slice(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
          <p className="text-zinc-500">
            {leagues.length > 0 
              ? `${leagues.length} leagues available` 
              : 'Browse all available leagues and standings'}
          </p>
        </div>
        <div className="flex gap-2">
          <form action="/api/sync-leagues" method="POST">
            <button 
              type="submit"
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors text-sm"
            >
              Sync Leagues
            </button>
          </form>
        </div>
      </div>

      {leagues.length === 0 ? (
        // Estado vacío - sin datos
        <Card className="glass border-0">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No leagues found</h3>
            <p className="text-zinc-500 mb-4">
              The database is empty. Sync leagues from API-Football to get started.
            </p>
            <form action="/api/sync-leagues" method="POST">
              <button 
                type="submit"
                className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                🚀 Sync Leagues Now
              </button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Leagues */}
          <section>
            <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top Leagues
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {topLeaguesList.map((league) => (
                <Link key={league.id} href={`/leagues/${league.id}`}>
                  <Card className="card-hover glass border-0 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="text-3xl">{getFlag(league.country)}</div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>
                      <h4 className="font-semibold text-zinc-100 mt-3 line-clamp-1">{league.name}</h4>
                      <p className="text-sm text-zinc-500">{league.country}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                        <span>Season {league.season}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Other Leagues */}
          {otherLeagues.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Other Leagues</h3>
              <Card className="glass border-0">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {otherLeagues.map((league, i) => (
                      <Link 
                        key={league.id} 
                        href={`/leagues/${league.id}`}
                        className={`flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors ${
                          i !== otherLeagues.length - 1 ? "border-b border-[#262626]" : ""
                        } ${i % 3 !== 2 ? "lg:border-r border-[#262626]" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFlag(league.country)}</span>
                          <div>
                            <p className="font-medium text-zinc-100">{league.name}</p>
                            <p className="text-sm text-zinc-500">{league.country}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
