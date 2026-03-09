'use client';

import { useState } from 'react';

export default function MLPredictTest() {
  const [homeTeam, setHomeTeam] = useState('Manchester City');
  const [awayTeam, setAwayTeam] = useState('Liverpool');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const invoke = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTeam, awayTeam }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🤖 ML Predict Test</h1>
      
      <div className="flex gap-4 mb-4">
        <input
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          placeholder="Home Team"
          className="border p-2 rounded"
        />
        <input
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          placeholder="Away Team"
          className="border p-2 rounded"
        />
        <button
          onClick={invoke}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Invoke'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
