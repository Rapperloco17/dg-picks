'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  leagueName: string;
}

export default function MLPredictTest() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});

  // Cargar partidos de hoy
  useEffect(() => {
    fetch('/api/db-matches?status=scheduled&limit=20')
      .then(r => r.json())
      .then(data => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  if (loading) return <div className="p-8">Cargando partidos...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 ML Predict - Partidos de Hoy</h1>
      
      {matches.length === 0 ? (
        <p>No hay partidos cargados para hoy</p>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <div key={match.id} className="border rounded-lg p-4 bg-white shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{match.leagueName}</p>
                  <p className="font-semibold text-lg">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Date(match.date).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => invoke(match)}
                  disabled={predicting[match.id]}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {predicting[match.id] ? 'Predicting...' : 'Invoke'}
                </button>
              </div>

              {predictions[match.id] && (
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  {predictions[match.id].error ? (
                    <p className="text-red-500">Error: {predictions[match.id].error}</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* 1X2 */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">1X2</p>
                        <p>1: {predictions[match.id].prediction?.result?.home}%</p>
                        <p>X: {predictions[match.id].prediction?.result?.draw}%</p>
                        <p>2: {predictions[match.id].prediction?.result?.away}%</p>
                        <p className="text-green-600 font-semibold">
                          Pick: {predictions[match.id].prediction?.result?.pick}
                        </p>
                      </div>

                      {/* Over/Under */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">Over/Under</p>
                        <p>O2.5: {predictions[match.id].prediction?.overUnder?.over25?.probability}%</p>
                        <p>U2.5: {predictions[match.id].prediction?.overUnder?.under25?.probability}%</p>
                        <p>O3.5: {predictions[match.id].prediction?.overUnder?.over35?.probability}%</p>
                      </div>

                      {/* BTTS */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">BTTS</p>
                        <p>Sí: {predictions[match.id].prediction?.btts?.yes?.probability}%</p>
                        <p className="text-green-600 font-semibold">
                          {predictions[match.id].prediction?.btts?.yes?.pick}
                        </p>
                      </div>

                      {/* Expected */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">Expected</p>
                        <p>Goles: {predictions[match.id].prediction?.expected?.totalGoals}</p>
                        <p>Corners: {predictions[match.id].prediction?.expected?.totalCorners}</p>
                        <p>Tarjetas: {predictions[match.id].prediction?.expected?.totalCards}</p>
                      </div>

                      {/* Corners por equipo */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">Corners</p>
                        <p>Home O4.5: {predictions[match.id].prediction?.corners?.homeOver45?.probability}%</p>
                        <p>Away O4.5: {predictions[match.id].prediction?.corners?.awayOver45?.probability}%</p>
                        <p>Total O9.5: {predictions[match.id].prediction?.corners?.over95?.probability}%</p>
                      </div>

                      {/* Cards por equipo */}
                      <div className="bg-white p-3 rounded border">
                        <p className="font-bold text-blue-600">Tarjetas</p>
                        <p>Home O2.5: {predictions[match.id].prediction?.cards?.homeOver25?.probability}%</p>
                        <p>Away O2.5: {predictions[match.id].prediction?.cards?.awayOver25?.probability}%</p>
                        <p>Total O3.5: {predictions[match.id].prediction?.cards?.over35?.probability}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
