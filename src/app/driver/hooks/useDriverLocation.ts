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
  const [source, setSource] = useState<'websocket' | 'gps'>('gps');
  const [speed, setSpeed] = useState<number>(0);

  // Utilizar geolocalización local en todo momento para asegurar fluidez y operabilidad offline
  useEffect(() => {
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
      console.error('[GPS Local] Error al obtener posición de alta precisión:', error.message);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { coords, source, speed };
}
