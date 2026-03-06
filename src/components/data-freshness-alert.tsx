'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { checkDataFreshness, getDataStatusMessage, DataFreshness } from '@/services/smart-data-selector';
import { useRouter } from 'next/navigation';

interface DataFreshnessAlertProps {
  leagueId: number;
  season: number;
  matchDate?: string;
}

export function DataFreshnessAlert({ leagueId, season, matchDate }: DataFreshnessAlertProps) {
  const [freshness, setFreshness] = useState<DataFreshness | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkFreshness();
  }, [leagueId, season]);

  const checkFreshness = async () => {
    setLoading(true);
    try {
      const result = await checkDataFreshness(leagueId, season);
      setFreshness(result);
    } catch (error) {
      console.error('Error checking data freshness:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !freshness) return null;

  // Solo mostrar alerta si es temporada actual y datos desactualizados
  if (!freshness.isCurrentSeason) return null;
  if (freshness.recommendedSource === 'local') return null;

  const message = getDataStatusMessage(freshness);

  return (
    <Alert variant={message.severity === 'warning' ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {message.title}
        {freshness.recommendedSource === 'api' && (
          <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">
            API
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3">{message.message}</p>
        
        <div className="flex gap-2">
          {message.action && (
            <Button 
              size="sm" 
              variant={message.severity === 'warning' ? 'default' : 'outline'}
              onClick={() => router.push('/admin/sync-data')}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {message.action}
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={checkFreshness}
          >
            <Database className="w-4 h-4 mr-1" />
            Verificar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
