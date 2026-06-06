'use client';

import { useEffect, useRef } from 'react';
import { getSessionUseCase, refreshSessionUseCase } from '../index';
import { generateDeviceFingerprint } from '@/shared/utils/fingerprint.util';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

export function useSilentRefresh() {
  const isRefreshing = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const performRefresh = async () => {
      if (isRefreshing.current) return;

      // Si el navegador reporta estar offline, evitamos el refresco
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[SilentRefresh] Navegador offline. Omitiendo refresco.');
        return;
      }

      const session = getSessionUseCase.execute();
      if (!session || !session.refreshToken) {
        // No hay sesión activa o no tiene token de refresco
        return;
      }

      try {
        isRefreshing.current = true;
        console.log('[SilentRefresh] Iniciando renovación de sesión...');

        const fingerprint = await generateDeviceFingerprint();
        const result = await refreshSessionUseCase.execute(session.refreshToken, fingerprint);

        result.match(
          (newSession) => {
            console.log('[SilentRefresh] Sesión renovada con éxito.');
          },
          (err) => {
            // Si el error es de red o fetch (offline), mantenemos la sesión y no deslogueamos
            const isNetworkError = 
              err.code === 'NETWORK_ERROR' || 
              err.message?.toLowerCase().includes('network') || 
              err.message?.toLowerCase().includes('fetch') ||
              err.message?.toLowerCase().includes('failed to fetch');

            if (isNetworkError) {
              console.warn('[SilentRefresh] Error de red/conexión. Manteniendo sesión local offline.', err.message);
              return;
            }

            console.warn('[SilentRefresh] Error de autorización al renovar sesión, cerrando sesión local:', err.message);
            // Si falla el refresco por token expirado, inválido o fingerprint alterado, redirigimos
            window.location.href = '/login';
          }
        );
      } catch (error) {
        console.error('[SilentRefresh] Error inesperado en el refresh:', error);
      } finally {
        isRefreshing.current = false;
      }
    };

    // Realizar un primer intento de refresco a los 30 segundos del inicio, por si cargó una sesión vieja
    const initialTimeout = setTimeout(() => {
      performRefresh();
    }, 30 * 1000);

    // Configurar el intervalo regular de refresco cada 10 minutos
    const interval = setInterval(performRefresh, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
}
