'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { hasPendingSync, getSyncInfo, syncNewMatches } from '@/services/incremental-sync';
import { loadDataFromStorage } from '@/services/persistent-data-store';
import { historicalData } from '@/services/historical-data-store';
import { loadAllLocalData } from '@/services/local-data-loader';

/**
 * Componente de sincronización automática
 * Se monta en el layout y verifica/actualiza datos al iniciar
 */
export function AutoSync() {
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Solo ejecutar una vez al montar
    if (hasChecked) return;
    
    const checkAndSync = async () => {
      console.log('[AutoSync] Verificando estado de datos...');
      
      // 1. Verificar si hay datos en localStorage
      const storedData = loadDataFromStorage();
      const syncInfo = getSyncInfo();
      
      if (!storedData || storedData.length === 0) {
        // No hay datos guardados - necesita carga inicial
        console.log('[AutoSync] No hay datos guardados, mostrando notificación');
        toast.info(
          'Datos no cargados',
          {
            description: 'Ve a Admin → ML Training para cargar los datos históricos',
            duration: 10000,
            icon: <AlertCircle className="w-4 h-4" />,
          }
        );
        setHasChecked(true);
        return;
      }
      
      // 2. Verificar si los datos están cargados en memoria
      if (!historicalData.isDataLoaded()) {
        console.log('[AutoSync] Restaurando datos desde localStorage...');
        await historicalData.loadFromFiles([{ leagueId: 0, data: storedData }]);
        console.log(`[AutoSync] ${storedData.length} partidos restaurados`);
      }
      
      // 3. Verificar si necesita sincronización
      if (hasPendingSync()) {
        console.log(`[AutoSync] Datos desactualizados (${syncInfo.daysSince} días), iniciando sync...`);
        
        toast.promise(
          syncNewMatches((message) => {
            console.log('[AutoSync]', message);
          }),
          {
            loading: 'Sincronizando partidos nuevos...',
            success: (result) => {
              if (result.newMatches > 0) {
                return `${result.newMatches} partidos nuevos agregados`;
              }
              return 'Datos actualizados (sin partidos nuevos)';
            },
            error: 'Error al sincronizar',
          }
        );
      } else {
        console.log('[AutoSync] Datos actualizados, no se necesita sync');
        
        // Mostrar confirmación silenciosa solo si había datos
        if (syncInfo.daysSince === 0) {
          toast.success(
            'Datos actualizados',
            {
              description: `Última sync: hoy • ${storedData.length.toLocaleString()} partidos disponibles`,
              duration: 3000,
              icon: <CheckCircle2 className="w-4 h-4" />,
            }
          );
        }
      }
      
      setHasChecked(true);
    };
    
    // Esperar 2 segundos para no bloquear la carga inicial de la app
    const timer = setTimeout(checkAndSync, 2000);
    
    return () => clearTimeout(timer);
  }, [hasChecked]);

  // Este componente no renderiza nada visible
  return null;
}

/**
 * Hook para usar sincronización manual
 */
export function useAutoSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(getSyncInfo());

  const triggerSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncNewMatches();
      setLastSync(getSyncInfo());
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const checkSync = () => {
    setLastSync(getSyncInfo());
    return hasPendingSync();
  };

  return {
    isSyncing,
    lastSync,
    needsSync: hasPendingSync(),
    triggerSync,
    checkSync,
  };
}
