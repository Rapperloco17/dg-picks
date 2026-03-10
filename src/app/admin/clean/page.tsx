'use client';

import { useState } from 'react';

export default function CleanDatabase() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const cleanDatabase = async () => {
    if (!confirm('¿Estás seguro de borrar todos los partidos sin nombres?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/clean-db', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧹 Limpieza de Base de Datos</h1>
      
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-red-400 mb-2">⚠️ Advertencia</h2>
        <p className="text-gray-300 mb-4">
          Esto eliminará todos los partidos que no tengan nombres de equipos guardados 
          (aproximadamente 130,000 partidos basura).
        </p>
        <p className="text-gray-400 text-sm">
          Los partidos con datos completos se mantendrán.
        </p>
      </div>

      <button
        onClick={cleanDatabase}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Limpiando...' : '🗑️ Borrar Partidos Sin Nombres'}
      </button>

      {result && (
        <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
