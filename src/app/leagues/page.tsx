"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Top leagues data - esto vendría de la API después
const topLeagues = [
  { id: 39, name: "Premier League", country: "England", teams: 20, matches: 380, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 140, name: "La Liga", country: "Spain", teams: 20, matches: 380, flag: "🇪🇸" },
  { id: 135, name: "Serie A", country: "Italy", teams: 20, matches: 380, flag: "🇮🇹" },
  { id: 78, name: "Bundesliga", country: "Germany", teams: 18, matches: 306, flag: "🇩🇪" },
  { id: 61, name: "Ligue 1", country: "France", teams: 18, matches: 306, flag: "🇫🇷" },
  { id: 88, name: "Eredivisie", country: "Netherlands", teams: 18, matches: 306, flag: "🇳🇱" },
  { id: 94, name: "Primeira Liga", country: "Portugal", teams: 18, matches: 306, flag: "🇵🇹" },
  { id: 2, name: "UEFA Champions League", country: "Europe", teams: 32, matches: 125, flag: "🇪🇺" },
  { id: 3, name: "UEFA Europa League", country: "Europe", teams: 32, matches: 125, flag: "🇪🇺" },
  { id: 848, name: "Conference League", country: "Europe", teams: 32, matches: 125, flag: "🇪🇺" },
];

const otherLeagues = [
  { id: 203, name: " Süper Lig", country: "Turkey", flag: "🇹🇷" },
  { id: 144, name: "Jupiler Pro League", country: "Belgium", flag: "🇧🇪" },
  { id: 113, name: "Allsvenskan", country: "Sweden", flag: "🇸🇪" },
  { id: 103, name: "Eliteserien", country: "Norway", flag: "🇳🇴" },
  { id: 119, name: "Superliga", country: "Denmark", flag: "🇩🇰" },
  { id: 106, name: "Ekstraklasa", country: "Poland", flag: "🇵🇱" },
  { id: 179, name: "Premiership", country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: 357, name: "Liga MX", country: "Mexico", flag: "🇲🇽" },
  { id: 128, name: "Liga Profesional", country: "Argentina", flag: "🇦🇷" },
  { id: 71, name: "Serie A", country: "Brazil", flag: "🇧🇷" },
  { id: 13, name: "Primera A", country: "Colombia", flag: "🇨🇴" },
  { id: 239, name: "Primera División", country: "Chile", flag: "🇨🇱" },
  { id: 40, name: "Championship", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 41, name: "League One", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 42, name: "League Two", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 136, name: "La Liga 2", country: "Spain", flag: "🇪🇸" },
  { id: 79, name: "2. Bundesliga", country: "Germany", flag: "🇩🇪" },
  { id: 137, name: "Serie B", country: "Italy", flag: "🇮🇹" },
];

export default function LeaguesPage() {
  const [search, setSearch] = useState("");

  const filteredTop = topLeagues.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.country.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOther = otherLeagues.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
          <p className="text-zinc-500">Browse all available leagues and standings</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search leagues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#141414] border-[#262626] text-zinc-100"
          />
        </div>
      </div>

      {/* Top Leagues */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Top Leagues
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filteredTop.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="card-hover glass border-0 cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{league.flag}</div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 mt-3 line-clamp-1">{league.name}</h4>
                  <p className="text-sm text-zinc-500">{league.country}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                    <span>{league.teams} teams</span>
                    <span>{league.matches} matches</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Other Leagues */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Other Leagues</h3>
        <Card className="glass border-0">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredOther.map((league, i) => (
                <Link 
                  key={league.id} 
                  href={`/leagues/${league.id}`}
                  className={`flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors ${
                    i !== filteredOther.length - 1 ? "border-b border-[#262626]" : ""
                  } ${i % 3 !== 2 ? "lg:border-r" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{league.flag}</span>
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
    </div>
  );
}
