import { useState, useEffect } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

export function useDriverLocation(
  socketPosition: Coords | null,
  socketSpeed: number,
  isSocketConnected: boolean
) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [source, setSource] = useState<'websocket' | 'gps'>('websocket');
  const [speed, setSpeed] = useState<number>(0);

  const socketLat = socketPosition?.lat;
  const socketLng = socketPosition?.lng;

  // 1. Sincronizar posición del websocket cuando está conectado (comparando valores primitivos para evitar bucle infinito)
  useEffect(() => {
    if (isSocketConnected) {
      if (socketLat !== undefined && socketLng !== undefined) {
        setCoords(prev => {
          if (prev && prev.lat === socketLat && prev.lng === socketLng) {
            return prev;
          }
          return { lat: socketLat, lng: socketLng };
        });
      }
      setSpeed(socketSpeed);
      setSource('websocket');
    }
  }, [socketLat, socketLng, socketSpeed, isSocketConnected]);

  // 2. Activar GPS local del navegador si se cae el websocket
  useEffect(() => {
    if (isSocketConnected) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn('[GPS Local] Geolocalización no disponible en este entorno.');
      return;
    }

    setSource('gps');

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, speed: gpsSpeed } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      
      // Convertir velocidad de m/s a km/h
      if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
        setSpeed(Math.round(gpsSpeed * 3.6));
      } else {
        setSpeed(0);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('[GPS Local] Error al obtener posición de contingencia:', error.message);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSocketConnected]);

  return { coords, source, speed };
}
