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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});

  // Sync fixtures automáticamente al cargar
  useEffect(() => {
    const init = async () => {
      setSyncing(true);
      setSyncMessage('Sincronizando partidos de las ligas principales...');
      
      try {
        // 1. Sync fixtures de la API
        const syncRes = await fetch('/api/sync-fixtures', { method: 'POST' });
        const syncData = await syncRes.json();
        
        if (syncData.success) {
          setSyncMessage(`✅ ${syncData.results.synced} partidos sincronizados`);
        }
        
        // 2. Cargar partidos de la BD
        const dbRes = await fetch('/api/db-matches?limit=50');
        const dbData = await dbRes.json();
        
        // Filtrar solo partidos válidos no terminados
        const valid = (dbData.matches || []).filter((m: any) => 
          m.homeTeamName && m.awayTeamName && 
          m.homeTeamName !== '' && m.awayTeamName !== '' &&
          m.status !== 'FT' && m.status !== 'AET' && m.status !== 'PEN' &&
          new Date(m.date) > new Date(Date.now() - 2 * 60 * 60 * 1000) // No más viejo de 2 horas
        );
        
        setMatches(valid);
      } catch (err: any) {
        setSyncMessage('❌ Error: ' + err.message);
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    };
    
    init();
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

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🤖 ML Predict</h1>
        <div className="flex items-center gap-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="text-gray-400">{syncMessage || 'Cargando...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 ML Predict - Partidos ({matches.length})</h1>
      
      {syncMessage && (
        <div className={`mb-4 p-3 rounded ${syncMessage.includes('✅') ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
          {syncMessage}
        </div>
      )}
      
      {matches.length === 0 ? (
        <div className="bg-yellow-900/20 border border-yellow-600 p-6 rounded text-center">
          <p className="text-yellow-400 text-lg mb-2">No hay partidos programados para hoy/mañana</p>
          <p className="text-gray-400 text-sm">Intenta recargar la página o ve a la sección "Partidos" del menú.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            🔄 Recargar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <div key={match.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-400">{match.leagueName} • {match.status}</p>
                  <p className="font-semibold text-lg text-white">
                    {match.homeTeamName} <span className="text-gray-500">vs</span> {match.awayTeamName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(match.date).toLocaleString('es-ES', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => invoke(match)}
                  disabled={predicting[match.id]}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {predicting[match.id] ? 'Analizando...' : '🔮 Predecir'}
                </button>
              </div>

              {predictions[match.id] && (
                <div className="mt-4 bg-gray-900 p-4 rounded border border-gray-700">
                  {predictions[match.id].error ? (
                    <p className="text-red-400">Error: {predictions[match.id].error}</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* 1X2 */}
                      <div className="bg-gray-800 p-3 rounded">
                        <p className="font-bold text-blue-400 mb-1">1X2</p>
                        <div className="space-y-1 text-gray-300">
                          <p>1: <span className="text-white font-semibold">{predictions[match.id].prediction?.result?.home}%</span></p>
                          <p>X: <span className="text-white">{predictions[match.id].prediction?.result?.draw}%</span></p>
                          <p>2: <span className="text-white">{predictions[match.id].prediction?.result?.away}%</span></p>
                          <p className="text-green-400 font-semibold mt-2">Pick: {predictions[match.id].prediction?.result?.pick}</p>
                        </div>
                      </div>

                      {/* Over/Under */}
                      <div className="bg-gray-800 p-3 rounded">
                        <p className="font-bold text-blue-400 mb-1">Over/Under</p>
                        <div className="space-y-1 text-gray-300">
                          <p>O2.5: <span className="text-white">{predictions[match.id].prediction?.overUnder?.over25?.probability}%</span></p>
                          <p>O3.5: <span className="text-white">{predictions[match.id].prediction?.overUnder?.over35?.probability}%</span></p>
                        </div>
                      </div>

                      {/* Corners */}
                      <div className="bg-gray-800 p-3 rounded">
                        <p className="font-bold text-blue-400 mb-1">Corners</p>
                        <div className="space-y-1 text-gray-300">
                          <p>Total: <span className="text-white font-semibold">{predictions[match.id].prediction?.expected?.totalCorners}</span></p>
                          <p>Local O4.5: <span className="text-white">{predictions[match.id].prediction?.corners?.homeOver45?.probability}%</span></p>
                          <p>Visita O4.5: <span className="text-white">{predictions[match.id].prediction?.corners?.awayOver45?.probability}%</span></p>
                        </div>
                      </div>

                      {/* Tarjetas */}
                      <div className="bg-gray-800 p-3 rounded">
                        <p className="font-bold text-blue-400 mb-1">Tarjetas</p>
                        <div className="space-y-1 text-gray-300">
                          <p>Total: <span className="text-white font-semibold">{predictions[match.id].prediction?.expected?.totalCards}</span></p>
                          <p>Local O2.5: <span className="text-white">{predictions[match.id].prediction?.cards?.homeOver25?.probability}%</span></p>
                          <p>Visita O2.5: <span className="text-white">{predictions[match.id].prediction?.cards?.awayOver25?.probability}%</span></p>
                        </div>
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
