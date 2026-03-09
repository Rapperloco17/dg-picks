'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: string;
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  leagueName: string;
  status: string;
}

export default function MLPredictTest() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/db-matches?limit=100')
      .then(r => r.json())
      .then(data => {
        console.log('Matches:', data);
        if (!data.matches || data.matches.length === 0) {
          setError('No hay partidos');
          setLoading(false);
          return;
        }
        // Solo partidos con nombres válidos y no terminados
        const valid = data.matches.filter((m: any) => 
          m.homeTeamName && m.awayTeamName && 
          m.homeTeamName !== '' && m.awayTeamName !== '' &&
          m.status !== 'FT' && m.status !== 'AET' && m.status !== 'PEN'
        );
        setMatches(valid.slice(0, 30));
        setLoading(false);
      })
      .catch(err => {
        setError('Error: ' + err.message);
        setLoading(false);
      });
  }, []);

  const invoke = async (match: Match) => {
    setPredicting(prev => ({ ...prev, [match.id]: true }));
    try {
      const res = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          homeTeam: match.homeTeamName, 
          awayTeam: match.awayTeamName 
        }),
      });
      const data = await res.json();
      setPredictions(prev => ({ ...prev, [match.id]: data }));
    } catch (error) {
      setPredictions(prev => ({ ...prev, [match.id]: { error: String(error) } }));
    }
    setPredicting(prev => ({ ...prev, [match.id]: false }));
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 ML Predict ({matches.length} partidos)</h1>
      
      {matches.length === 0 ? (
        <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded">
          <p className="text-yellow-400">No hay partidos válidos con nombres de equipos.</p>
          <p className="text-sm text-gray-400 mt-2">
            Los 130k partidos históricos no tienen nombres. Ve a Admin → Sincronizar para actualizar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <div key={match.id} className="border rounded-lg p-4 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-400">{match.leagueName} • {match.status}</p>
                  <p className="font-semibold text-lg text-white">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </p>
                  <p className="text-xs text-gray-500">ID: {match.fixtureId}</p>
                </div>
                <button
                  onClick={() => invoke(match)}
                  disabled={predicting[match.id]}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {predicting[match.id] ? '...' : 'Invoke'}
                </button>
              </div>

              {predictions[match.id] && (
                <div className="mt-4 bg-gray-900 p-4 rounded text-sm">
                  <pre className="text-green-400 overflow-auto max-h-96">
                    {JSON.stringify(predictions[match.id], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
