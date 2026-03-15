'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Database, 
  Download, 
  Play, 
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function MLAdminPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ml-train-full');
      const data = await res.json();
      setStatus(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const downloadData = async () => {
    setAction('download');
    setLoading(true);
    try {
      const res = await fetch('/api/download-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxMatches: 50000 }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
    fetchStatus();
  };

  const trainModel = async () => {
    setAction('train');
    setLoading(true);
    try {
      const res = await fetch('/api/ml-train-full', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
    fetchStatus();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Brain className="w-6 h-6 text-amber-500" />
          ML Model Admin
        </h2>
        <p className="text-zinc-500">Train and manage the prediction model</p>
      </div>

      {/* Status */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Model Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.currentModel ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-zinc-100">Model Trained: {status.currentModel.version}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <p className="text-sm text-zinc-500">Accuracy</p>
                  <p className="text-2xl font-bold text-amber-500">{status.currentModel.accuracy}</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <p className="text-sm text-zinc-500">Matches</p>
                  <p className="text-2xl font-bold text-zinc-100">{status.currentModel.matches.toLocaleString()}</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <p className="text-sm text-zinc-500">Last Training</p>
                  <p className="text-sm font-bold text-zinc-100">
                    {new Date(status.currentModel.trainedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              <span>No model trained yet</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              1. Download Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">
              Download up to 50,000 historical matches from API-Football
            </p>
            <Button 
              onClick={downloadData}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {loading && action === 'download' ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Matches
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              2. Train Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">
              Train TensorFlow model with downloaded matches
            </p>
            <Button 
              onClick={trainModel}
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              {loading && action === 'train' ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Train Model
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className={`border-0 ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                  {result.success ? 'Success' : 'Error'}
                </p>
                <pre className="text-sm text-zinc-400 mt-2 overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="glass border-0 border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <h3 className="font-medium text-zinc-100 mb-2">How to use:</h3>
          <ol className="list-decimal list-inside text-sm text-zinc-500 space-y-1">
            <li>Click "Download Matches" to fetch historical data (takes 5-10 minutes)</li>
            <li>Click "Train Model" to train the TensorFlow model (takes 2-3 minutes)</li>
            <li>Once trained, predictions will use the ML model</li>
            <li>Re-train periodically (weekly) with new data for better accuracy</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
