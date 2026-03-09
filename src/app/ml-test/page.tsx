'use client';

import { useState, useEffect } from 'react';

export default function MLPredictTest() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Manual input
  const [homeTeam, setHomeTeam] = useState('Manchester City');
  const [awayTeam, setAwayTeam] = useState('Liverpool');
  
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/db-matches?limit=50')
      .then(r => r.json())
      .then(data => {
        const valid = (data.matches || []).filter((m: any) => 
          m.homeTeamName && m.awayTeamName && 
          m.homeTeamName !== '' && m.awayTeamName !== ''
        );
        setMatches(valid.slice(0, 10));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const invoke = async (home: string, away: string, id?: string) => {
    const key = id || `${home}-${away}`;
    setPredicting(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTeam: home, awayTeam: away }),
      });
      const data = await res.json();
      setPredictions(prev => ({ ...prev, [key]: data }));
    } catch (error) {
      setPredictions(prev => ({ ...prev, [key]: { error: String(error) } }));
    }
    setPredicting(prev => ({ ...prev, [key]: false }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 ML Predict Test</h1>
      
      {/* Manual Input */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Ingresar equipos manualmente</h2>
        <div className="flex gap-4 mb-4">
          <input
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="Equipo local"
            className="bg-gray-700 text-white border border-gray-600 p-2 rounded flex-1"
          />
          <span className="text-white self-center">VS</span>
          <input
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="Equipo visitante"
            className="bg-gray-700 text-white border border-gray-600 p-2 rounded flex-1"
          />
          <button
            onClick={() => invoke(homeTeam, awayTeam)}
            disabled={predicting[`${homeTeam}-${awayTeam}`]}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {predicting[`${homeTeam}-${awayTeam}`] ? '...' : 'Invoke'}
          </button>
        </div>
        
        {predictions[`${homeTeam}-${awayTeam}`] && (
          <div className="mt-4 bg-gray-900 p-4 rounded">
            <pre className="text-green-400 text-sm overflow-auto max-h-96">
              {JSON.stringify(predictions[`${homeTeam}-${awayTeam}`], null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Matches from DB */}
      {!loading && matches.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-white">Partidos de la BD ({matches.length})</h2>
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">{match.leagueName}</p>
                    <p className="font-semibold text-white">
                      {match.homeTeamName} vs {match.awayTeamName}
                    </p>
                  </div>
                  <button
                    onClick={() => invoke(match.homeTeamName, match.awayTeamName, match.id)}
                    disabled={predicting[match.id]}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {predicting[match.id] ? '...' : 'Invoke'}
                  </button>
                </div>

                {predictions[match.id] && (
                  <div className="mt-4 bg-gray-900 p-4 rounded">
                    <pre className="text-green-400 text-sm overflow-auto max-h-96">
                      {JSON.stringify(predictions[match.id], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && matches.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded">
          <p className="text-yellow-400">No hay partidos con nombres en la BD.</p>
          <p className="text-sm text-gray-400">Usa el formulario arriba para probar predicciones.</p>
        </div>
      )}
    </div>
  );
}
