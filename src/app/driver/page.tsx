'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { DailyTicketApiService } from '@/app/features/admin/services/daily-ticket-api.service';
import { useDriverLocation } from './hooks/useDriverLocation';
import * as turf from '@turf/turf';
import localforage from 'localforage';
import styles from './Driver.module.css';

// Importación dinámica de GpsMap para evitar fallos de compilación Server-Side (Leaflet/DOM dependency)
const GpsMap = dynamic(
  () => import('@/shared/components/maps/gps-map.component'),
  { ssr: false }
);

interface VehiclePosition {
  id: string;
  plate: string;
  driverName: string;
  driverId: string | null; // ID único del conductor para emparejamiento seguro
  lat: number;
  lng: number;
  speed: number;
  isActive: boolean;
  lastUpdated: string;
  dailyTicketId?: string | null;
  hasActiveTicket?: boolean;
  routeId?: string | null;
  direction?: 'IDA' | 'VUELTA' | null;
  roundId?: string | null;
  roundStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null;
}

interface ActiveNotification {
  id: string;
  type: 'INFRACTION' | 'CHECKPOINT_MARKED' | 'NEXT_CHECKPOINT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export default function DriverPage() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('Conductor');
  const [driverId, setDriverId] = useState<string>(''); // ID inmutable del chofer logueado
  const [isConnected, setIsConnected] = useState(false);
  const [activeNotification, setActiveNotification] = useState<ActiveNotification | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [offlineCheckpoints, setOfflineCheckpoints] = useState<any[]>([]);
  const [markedStopsThisRound, setMarkedStopsThisRound] = useState<string[]>([]);
  const [localActiveVehicle, setLocalActiveVehicle] = useState<VehiclePosition | null>(null);
  const socketRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  // 1. Cargar datos de la sesión del chofer desde las cookies
  useEffect(() => {
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setDriverName(session.user.name || 'Conductor');
        setDriverId(session.user.id || '');
      } catch (e) {
        console.error('[Chofer] Error al parsear los datos de sesión de la cookie', e);
      }
    }
  }, []);

  // 1.1. Cargar el vehículo activo guardado en IndexedDB localmente para contingencia offline
  useEffect(() => {
    const loadLocalActiveVehicle = async () => {
      try {
        const stored = await localforage.getItem<VehiclePosition>('gps_central_local_active_vehicle');
        if (stored) {
          setLocalActiveVehicle(stored);
        }
      } catch (err) {
        console.error('[Chofer Cache] Error al cargar localActiveVehicle de localforage:', err);
      }
    };
    loadLocalActiveVehicle();
  }, []);

  // 2. Cargar las rutas de la empresa para guía de navegación
  useEffect(() => {
    const fetchRoutes = async () => {
      const sessionStr = Cookies.get('gps_central_session');
      if (!sessionStr) return;

      let token = '';
      try {
        const session = JSON.parse(sessionStr);
        token = session.token || '';
      } catch (e) {
        console.error('[Chofer] Error al extraer el token de sesión', e);
        return;
      }

      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

      try {
        const response = await fetch(`${apiUrl}/routes/list`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const apiResponse = await response.json();
          const loadedRoutes = apiResponse.data || [];
          setRoutes(loadedRoutes);
          // Seleccionar la primera ruta por defecto si existe como guía y no hay una ya preseleccionada en caliente
          if (loadedRoutes.length > 0) {
            setSelectedRouteId(prev => prev || loadedRoutes[0].id);
          }
        }
      } catch (err) {
        console.error('[Chofer] Error al cargar rutas de la empresa:', err);
      }
    };
    fetchRoutes();
  }, []);

  // 3. Inicializar Socket.io para telemetría en tiempo real
  useEffect(() => {
    let script: HTMLScriptElement | null = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.async = true;

    script.onload = () => {
      initializeSocket();
    };

    document.body.appendChild(script);

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [driverName]); // Reinicializar si el nombre cambia para asegurar el filtrado de conductor

  const playAlertSound = (type: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (type === 'INFRACTION') {
        const playTone = (delay: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, audioCtx.currentTime);

          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.45);
        };

        playTone(0);
        playTone(0.45);
      } else if (type === 'CHECKPOINT_MARKED') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (err) {
      console.error('[Chofer Audio] Error en oscilador:', err);
    }
  };

  const initializeSocket = () => {
    const sessionStr = Cookies.get('gps_central_session');
    if (!sessionStr) return;

    let token = '';
    try {
      const session = JSON.parse(sessionStr);
      token = session.token || '';
    } catch (e) {
      console.error('[Chofer Websocket] Error al parsear sesión', e);
      return;
    }

    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const socketUrl = apiUrl.replace('/api/v1', '').replace('/api/v1/', '');

    const io = (window as any).io;
    if (!io) return;

    const socket = io(`${socketUrl}/driver`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('positions', (positionsData: any[]) => {
      const formattedPositions: VehiclePosition[] = positionsData.map(pos => ({
        id: pos.vehicleId || pos.deviceId,
        plate: pos.plate || `Vehículo ${pos.deviceId}`,
        driverName: pos.driverName || 'No asignado',
        driverId: pos.driverId || null,
        lat: parseFloat(pos.latitude || pos.lat),
        lng: parseFloat(pos.longitude || pos.lng),
        speed: Math.round(pos.speed || 0),
        isActive: pos.speed > 0 || pos.attributes?.motion || false,
        lastUpdated: pos.deviceTime || pos.lastUpdated || new Date().toISOString(),
        dailyTicketId: pos.dailyTicketId,
        hasActiveTicket: pos.hasActiveTicket,
        routeId: pos.routeId || null,
        direction: pos.direction || null,
        roundId: pos.roundId || null,
        roundStatus: pos.roundStatus || null,
      }));

      setVehicles(formattedPositions);

      // Guardar sincronización de tiempo con el servidor usando la hora de la última posición del socket
      if (positionsData.length > 0) {
        const samplePos = positionsData[0];
        const serverTimeStr = samplePos.deviceTime || samplePos.lastUpdated;
        if (serverTimeStr) {
          const serverTimeMs = new Date(serverTimeStr).getTime();
          localStorage.setItem('sync_server_time', String(serverTimeMs));
          localStorage.setItem('sync_performance_time', String(performance.now()));
          // Guardar también un offset simple de contingencia
          const localOffset = serverTimeMs - Date.now();
          localStorage.setItem('sync_time_offset', String(localOffset));
        }
      }

      // Si entre las posiciones del socket viene nuestro bus, actualizar localActiveVehicle y guardarlo
      const myBus = formattedPositions.find(v => v.driverId === driverId);
      if (myBus) {
        setLocalActiveVehicle(myBus);
        localforage.setItem('gps_central_local_active_vehicle', myBus).catch(err => {
          console.error('[Chofer Cache] Error al persistir localActiveVehicle en IndexedDB', err);
        });
      }
    });

    socket.on('notification', (notif: ActiveNotification) => {
      setActiveNotification(notif);
      playAlertSound(notif.type);

      // Sincronizar marcado de control en tiempo real en la UI del conductor
      const targetGeofenceId = notif.data?.traccarGeofenceId;
      if (
        (notif.type === 'CHECKPOINT_MARKED' || notif.type === 'INFRACTION') &&
        targetGeofenceId
      ) {
        const idStr = String(targetGeofenceId);
        setMarkedStopsThisRound(prev => {
          if (!prev.includes(idStr)) {
            return [...prev, idStr];
          }
          return prev;
        });
      }

      // Auto-ocultar: 10 segundos para multas, 5 segundos para otros avisos
      const duration = notif.type === 'INFRACTION' ? 10000 : 5000;
      setTimeout(() => {
        setActiveNotification(prev => prev?.id === notif.id ? null : prev);
      }, duration);
    });
  };

  // Buscar el vehículo asignado a este chofer de forma reactiva por su ID de usuario único
  const myVehicle = vehicles.find(
    v => v.driverId === driverId
  );

  // Híbrido: Si no hay señal de red, se cae el websocket y la lista de vehículos, caer en la persistencia local
  const activeVehicle = myVehicle || localActiveVehicle;

  // Obtener la ruta seleccionada para guiar al chofer en el mapa (definido arriba para su uso en hooks de efecto de geocercas)
  const selectedRoute = Array.isArray(routes) ? routes.find(r => r.id === selectedRouteId) : undefined;
  const routeOutboundCoords = selectedRoute?.outboundCoordinates || [];
  const routeInboundCoords = selectedRoute?.inboundCoordinates || [];
  const activeDirection = activeVehicle?.direction || 'IDA';

  const routeStops = selectedRoute?.stops
    ?.filter((stop: any) => stop.direction === activeDirection)
    ?.map((stop: any, index: number) => {
      let lat = 0;
      let lng = 0;
      let polygonCoordinates = undefined;

      if (stop.coordinates && stop.coordinates.length > 0) {
        polygonCoordinates = stop.coordinates;
        const sumLat = stop.coordinates.reduce((sum: number, c: any) => sum + c.lat, 0);
        const sumLng = stop.coordinates.reduce((sum: number, c: any) => sum + c.lng, 0);
        lat = sumLat / stop.coordinates.length;
        lng = sumLng / stop.coordinates.length;
      }

      return {
        geofenceId: String(stop.traccarGeofenceId),
        name: stop.name || `Paradero ${index + 1}`,
        lat,
        lng,
        stopOrder: index + 1,
        minutesFromStart: stop.minutesFromStart || 0,
        polygonCoordinates,
      };
    }) || [];

  // Sincronizar automáticamente la ruta seleccionada con la asignada en el ticket de salida en caliente
  useEffect(() => {
    if (activeVehicle && activeVehicle.routeId) {
      setSelectedRouteId(activeVehicle.routeId);
    }
  }, [activeVehicle?.routeId, routes]);

  const requestWakeLock = async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (wakeLockRef.current) return;
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[Wake Lock] La pantalla se mantendrá encendida.');
      } catch (err: any) {
        console.warn('[Wake Lock] Error al solicitar Wake Lock:', err.message);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[Wake Lock] Bloqueo de pantalla liberado.');
      } catch (err: any) {
        console.warn('[Wake Lock] Error al liberar Wake Lock:', err.message);
      }
    }
  };

  // Mantener la pantalla encendida (Screen Wake Lock API) mientras la página del conductor esté visible en primer plano
  useEffect(() => {
    const initWakeLock = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      } else {
        await releaseWakeLock();
      }
    };

    initWakeLock();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      } else {
        await releaseWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  const handleCloseWorkday = async () => {
    if (!activeVehicle || !activeVehicle.dailyTicketId) return;

    const confirmed = window.confirm(
      '¿Estás seguro de que deseas finalizar tu jornada laboral? Se cerrará tu ticket diario activo y se detendrá el monitoreo de ruta.'
    );

    if (!confirmed) return;

    setIsClosing(true);
    const dailyTicketApiService = new DailyTicketApiService();

    try {
      const response = await dailyTicketApiService.closeWorkday(activeVehicle.dailyTicketId);
      if (response.success) {
        setActiveNotification({
          id: String(Date.now()),
          type: 'SYSTEM',
          title: 'Jornada Finalizada',
          message: 'Tu jornada laboral ha sido finalizada correctamente.',
          timestamp: new Date().toISOString()
        });

        // Limpiar el ticket diario del vehículo de forma reactiva local
        setVehicles(prev => prev.map(v => {
          if (v.id === activeVehicle.id) {
            return {
              ...v,
              dailyTicketId: null,
              hasActiveTicket: false,
              routeId: null,
              direction: null
            };
          }
          return v;
        }));
      } else {
        setActiveNotification({
          id: String(Date.now()),
          type: 'INFRACTION',
          title: 'Error al finalizar',
          message: response.errorMessage || 'No se pudo cerrar la jornada laboral.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[Chofer] Error al finalizar jornada:', err);
      setActiveNotification({
        id: String(Date.now()),
        type: 'INFRACTION',
        title: 'Error de conexión',
        message: 'Ocurrió un error al comunicarse con el servidor.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsClosing(false);
    }
  };

  // 5. Cargar buffer offline desde localforage al montar
  useEffect(() => {
    const loadOfflineCheckpoints = async () => {
      try {
        const stored = await localforage.getItem<any[]>('gps_central_offline_checkpoints');
        if (stored) {
          setOfflineCheckpoints(stored);
        }
      } catch (err) {
        console.error('[Chofer Offline] Error al precargar buffer offline de localforage:', err);
      }
    };
    loadOfflineCheckpoints();
  }, []);

  // Limpiar paraderos marcados localmente si cambia la vuelta (roundId)
  useEffect(() => {
    setMarkedStopsThisRound([]);
  }, [activeVehicle?.roundId]);

  // Hook de localización de contingencia híbrido (memorizando coordenadas para evitar re-renders infinitos)
  const socketCoords = useMemo(() => {
    return activeVehicle ? { lat: activeVehicle.lat, lng: activeVehicle.lng } : null;
  }, [activeVehicle?.lat, activeVehicle?.lng]);
  const socketSpeed = activeVehicle ? activeVehicle.speed : 0;

  const { coords: activeCoords, source: locationSource, speed: activeSpeed } = useDriverLocation(
    socketCoords,
    socketSpeed,
    isConnected
  );

  // 6. Cálculo geométrico local de geocercas (Turf.js) en modo offline y móvil-first
  useEffect(() => {
    if (
      !activeCoords ||
      !activeVehicle ||
      !activeVehicle.dailyTicketId ||
      !activeVehicle.roundId ||
      !Array.isArray(routeStops) ||
      routeStops.length === 0
    ) {
      return;
    }

    const checkGeofences = async () => {
      for (const stop of routeStops) {
        if (markedStopsThisRound.includes(stop.geofenceId)) continue;

        let isInside = false;

        try {
          if (stop.polygonCoordinates && stop.polygonCoordinates.length >= 3) {
            // Turf requiere un array de coordenadas [lng, lat]
            const turfCoords = stop.polygonCoordinates.map((c: any) => [c.lng, c.lat]);

            // Asegurar que el polígono esté cerrado para Turf
            if (
              turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
              turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
            ) {
              turfCoords.push(turfCoords[0]);
            }

            const poly = turf.polygon([turfCoords]);
            const pt = turf.point([activeCoords.lng, activeCoords.lat]);
            isInside = turf.booleanPointInPolygon(pt, poly);
          } else if (stop.lat && stop.lng) {
            // Geocerca circular de contingencia
            const from = turf.point([activeCoords.lng, activeCoords.lat]);
            const to = turf.point([stop.lng, stop.lat]);
            const dist = turf.distance(from, to, { units: 'meters' });
            isInside = dist <= 15; // Ajustamos a 15 metros para mayor margen de tolerancia GPS en carretera
          }
        } catch (err) {
          console.error('[Chofer Offline] Error al procesar geocerca local para:', stop.name, err);
        }

        if (isInside) {
          // Marcado local exitoso
          playAlertSound('CHECKPOINT_MARKED');
          setMarkedStopsThisRound(prev => [...prev, stop.geofenceId]);

          // Calcular la hora real del servidor usando el reloj monótono (performance.now) contra fraudes
          let trueEventTime = new Date();
          try {
            const syncServerTime = parseInt(localStorage.getItem('sync_server_time') || '0', 10);
            const syncPerformanceTime = parseFloat(localStorage.getItem('sync_performance_time') || '0');
            if (syncServerTime > 0 && syncPerformanceTime > 0) {
              const elapsedMs = performance.now() - syncPerformanceTime;
              trueEventTime = new Date(syncServerTime + elapsedMs);
            } else {
              const timeOffset = parseInt(localStorage.getItem('sync_time_offset') || '0', 10);
              trueEventTime = new Date(Date.now() + timeOffset);
            }
          } catch (e) {
            console.error('[Chofer Time] Error al calcular la hora real del servidor:', e);
          }

          const newOfflineEvent = {
            dailyTicketId: activeVehicle.dailyTicketId,
            roundId: activeVehicle.roundId,
            traccarGeofenceId: parseInt(stop.geofenceId, 10),
            reachedAt: trueEventTime.toISOString(),
            latitude: activeCoords.lat,
            longitude: activeCoords.lng,
          };

          try {
            const currentOffline = (await localforage.getItem<any[]>('gps_central_offline_checkpoints')) || [];
            currentOffline.push(newOfflineEvent);
            setOfflineCheckpoints(currentOffline);
            await localforage.setItem('gps_central_offline_checkpoints', currentOffline);
          } catch (err) {
            console.error('[Chofer Offline] Error al guardar checkpoint en IndexedDB con localforage:', err);
          }

          setActiveNotification({
            id: String(Date.now()),
            type: 'CHECKPOINT_MARKED',
            title: 'Control Marcado (Celular)',
            message: `Has ingresado a: ${stop.name} (Calculado por tu celular)`,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    checkGeofences();
  }, [activeCoords, routeStops, activeVehicle, markedStopsThisRound]);

  // 7. Sync Engine: Sincronizar paraderos locales al recuperar red
  useEffect(() => {
    if (!isConnected || offlineCheckpoints.length === 0) return;

    const syncOfflineData = async () => {
      const sessionStr = Cookies.get('gps_central_session');
      if (!sessionStr) return;

      let token = '';
      try {
        const session = JSON.parse(sessionStr);
        token = session.token || '';
      } catch (e) {
        console.error('[Chofer Sync] Error al parsear sesión', e);
        return;
      }

      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

      try {
        const response = await fetch(`${apiUrl}/daily-tickets/sync-offline-checkpoints`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ checkpoints: offlineCheckpoints }),
        });

        if (response.ok) {
          setOfflineCheckpoints([]);
          await localforage.removeItem('gps_central_offline_checkpoints');

          setActiveNotification({
            id: String(Date.now()),
            type: 'SYSTEM',
            title: 'Sincronización Exitosa',
            message: 'Tus registros de paradero offline se sincronizaron con el servidor.',
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('[Chofer Sync] Fallo al sincronizar en backend:', response.statusText);
        }
      } catch (err) {
        console.error('[Chofer Sync] Error de red:', err);
      }
    };

    syncOfflineData();
  }, [isConnected, offlineCheckpoints]);

  // Filtrar vehículos para pasar al mapa: en modo chofer, solo mostramos SU vehículo asignado (adaptado con GPS local si está offline)
  const mapVehicles = activeVehicle && activeCoords ? [{
    ...activeVehicle,
    lat: activeCoords.lat,
    lng: activeCoords.lng,
    speed: activeSpeed,
    isActive: activeSpeed > 0
  }] : [];

  // 8. Cálculos de navegación asistida en tiempo real (Turf.js)
  const nextStop = routeStops.find((stop: any) => !markedStopsThisRound.includes(stop.geofenceId));
  let distanceToNextStop = 0;
  let nextStopEta = 0;
  let etaStr = '--:--';

  if (activeCoords && nextStop) {
    try {
      const from = turf.point([activeCoords.lng, activeCoords.lat]);
      const to = turf.point([nextStop.lng, nextStop.lat]);
      distanceToNextStop = turf.distance(from, to, { units: 'meters' });

      const speedKmh = activeSpeed > 10 ? activeSpeed : 25;
      const speedMs = speedKmh / 3.6;
      const timeSeconds = distanceToNextStop / speedMs;
      nextStopEta = Math.ceil(timeSeconds / 60);

      // Calcular ETA total de la vuelta basándose en los minutos estimados restantes
      const lastStop = routeStops[routeStops.length - 1];
      const remainingMinutes = lastStop ? Math.max(0, lastStop.minutesFromStart - nextStop.minutesFromStart) : 0;
      const totalEtaMinutes = remainingMinutes + nextStopEta;

      const etaTime = new Date();
      etaTime.setMinutes(etaTime.getMinutes() + totalEtaMinutes);
      etaStr = etaTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.error('[Navegación] Error al calcular distancias con Turf.js:', err);
    }
  }

  return (
    <DashboardLayout noPadding={true} hideBottomNav={true}>
      <div className={styles.container}>
        {/* Banner Superior de Navegación Asistida Premium (Estilo Waze) */}
        {activeVehicle?.dailyTicketId && nextStop && (
          <div className={styles.navigationBanner}>
            <div className={styles.navIcon}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', transform: 'rotate(-45deg)' }}>navigation</span>
            </div>
            <div className={styles.navInfo}>
              <div className={styles.navInstruction}>
                Avanza hacia <span className={styles.nextStopName}>{nextStop.name}</span>
              </div>
              <div className={styles.navDistance}>
                {distanceToNextStop > 1000
                  ? `a ${(distanceToNextStop / 1000).toFixed(1)} km`
                  : `a ${Math.round(distanceToNextStop)} metros`}
              </div>
            </div>
            <div className={styles.navTelemetryContainer}>
              <div className={`${styles.navSpeedBadge} ${activeSpeed > 60 ? styles.speedAlerting : ''}`}>
                <span className={styles.navSpeedValue}>{activeSpeed}</span>
                <span className={styles.navSpeedLabel}>km/h</span>
              </div>
              <div className={styles.navEtaBadge}>
                <span className={styles.navEtaMinutes}>{nextStopEta}</span>
                <span className={styles.navEtaLabel}>min</span>
              </div>
            </div>
          </div>
        )}

        {/* Toast de Notificación Premium con Glassmorphism */}
        {activeNotification && (
          <div
            className={`${styles.notificationToast} ${activeNotification.type === 'INFRACTION' ? styles.toastInfraction : styles.toastSuccess
              }`}
            onClick={() => setActiveNotification(null)}
          >
            <div className={styles.toastIcon}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                {activeNotification.type === 'INFRACTION' ? 'warning' : 'check_circle'}
              </span>
            </div>
            <div className={styles.toastContent}>
              <div className={styles.toastTitle}>{activeNotification.title}</div>
              <div className={styles.toastMessage}>{activeNotification.message}</div>
            </div>
            <button
              className={styles.toastClose}
              onClick={(e) => {
                e.stopPropagation();
                setActiveNotification(null);
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        )}

        {/* Indicador de Estado de Conexión flotante */}
        <div className={styles.connectionStatus}>
          <span className={`${styles.statusDot} ${isConnected ? styles.dotConnected : styles.dotDisconnected}`} />
          {isConnected ? 'Sistema conectado en tiempo real' : 'Reconectando con el servidor...'}
        </div>



        {/* Contenedor del Mapa - Pantalla Completa Edge-to-Edge */}
        <div className={styles.mapContainer}>
          <GpsMap
            mode="driver"
            vehicles={mapVehicles}
            activeVehicleId={activeVehicle?.id}
            activeDirection={activeVehicle?.direction}
            routesCoordinates={routeOutboundCoords}
            alternativeRouteCoordinates={routeInboundCoords}
            stops={routeStops}
            zoom={16}
          />
        </div>

        {/* Mini Tarjeta Flotante Informativa del Chofer (Vectura Glassmorphism) */}
        <div className={`${styles.driverPanel} ${isCollapsed ? styles.panelCollapsed : ''}`}>
          <div className={styles.panelHeader}>
            <div className={styles.driverHeaderInfo}>
              <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '22px' }}>
                account_circle
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.driverWelcome}>Hola, Conductor</span>
                <span className={styles.driverNameText}>{driverName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeVehicle && !isCollapsed && (() => {
                const status = activeVehicle.roundStatus;
                const direction = activeVehicle.direction || 'IDA';

                if (status === 'PENDING') {
                  return (
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe'
                      }}
                    >
                      Espera - {direction}
                    </span>
                  );
                }

                if (status === 'IN_PROGRESS') {
                  return (
                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                      En Ruta - {direction}
                    </span>
                  );
                }

                if (status === 'COMPLETED') {
                  return (
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: '#faf5ff',
                        color: '#7c3aed',
                        border: '1px solid #e9d5ff'
                      }}
                    >
                      Completa - {direction}
                    </span>
                  );
                }

                // Fallback en caso de ausencia de estados de vuelta o ticket diario
                return (
                  <span className={`${styles.statusBadge} ${styles.statusStopped}`}>
                    Sin ticket
                  </span>
                );
              })()}

              {/* Botón de Colapsar/Desplegar con feedback visual */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={styles.collapseBtn}
                title={isCollapsed ? "Mostrar detalles" : "Ocultar detalles"}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                  {isCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                </span>
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <>
              <div className={styles.panelDivider} />

              {activeVehicle ? (
                <>
                  <div className={styles.panelDetails}>
                    {/* Detalle 1: Placa del vehículo */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: '#64748b', fontSize: '18px' }}>
                        directions_bus
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Unidad Asignada</span>
                        <span className={styles.detailValue}>{activeVehicle.plate}</span>
                      </div>
                    </div>

                    {/* Detalle 2: Velocidad actual */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: '#64748b', fontSize: '18px' }}>
                        speed
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Velocidad</span>
                        <span className={styles.detailValue}>{activeSpeed} km/h</span>
                      </div>
                    </div>

                    {/* Detalle 3: ETA de llegada */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '18px' }}>
                        schedule
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Llegada Estimada</span>
                        <span className={styles.detailValue} style={{ color: '#10b981', fontWeight: 600 }}>{etaStr}</span>
                      </div>
                    </div>

                    {/* Detalle 4: Controles de paradero restantes */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '18px' }}>
                        fact_check
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Controles Marcados</span>
                        <span className={styles.detailValue}>{markedStopsThisRound.length} de {routeStops.length}</span>
                      </div>
                    </div>
                  </div>
                  {activeVehicle.dailyTicketId && (
                    <button
                      className={styles.closeWorkdayBtn}
                      onClick={handleCloseWorkday}
                      disabled={isClosing}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                        logout
                      </span>
                      {isClosing ? 'Finalizando jornada...' : 'Finalizar Jornada Laboral'}
                    </button>
                  )}
                </>
              ) : (
                <div className={styles.noVehicleContainer}>
                  <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '8px' }}>
                    no_accounts
                  </span>
                  <span className={styles.noVehicleText}>Jornada pendiente de inicio</span>
                  <span className={styles.noVehicleSubtext}>
                    Acércate a la oficina de control para realizar el pago de tu salida, registrar la unidad asignada y habilitar tu ticket diario de monitoreo.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
