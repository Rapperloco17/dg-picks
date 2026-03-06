'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getApiCallsCount } from '@/services/api-football';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export function ApiStatusCard() {
  const [apiCalls, setApiCalls] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  
  const MAX_DAILY_CALLS = 75000;
  const usagePercent = (apiCalls / MAX_DAILY_CALLS) * 100;

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update API calls periodically
    const updateCalls = () => {
      setApiCalls(getApiCallsCount());
    };
    
    updateCalls();
    const interval = setInterval(updateCalls, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Estado API</span>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Llamadas hoy</span>
            <span className="font-medium">{apiCalls.toLocaleString()} / {MAX_DAILY_CALLS.toLocaleString()}</span>
          </div>
          
          <Progress 
            value={usagePercent} 
            className="h-2"
          />
          
          <div className="flex items-center gap-2">
            {usagePercent < 50 ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                Normal
              </Badge>
            ) : usagePercent < 80 ? (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Moderado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-400 border-red-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Alto uso
              </Badge>
            )}
            
            <Badge variant="outline" className="text-slate-400">
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
