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
            console.warn('[SilentRefresh] Error al renovar sesión, cerrando sesión local:', err.message);
            // Si falla el refresco (por ejemplo, token expirado o fingerprint alterado),
            // redirigimos al login
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
