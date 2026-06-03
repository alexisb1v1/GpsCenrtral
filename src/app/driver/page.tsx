'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { DailyTicketApiService } from '@/app/features/admin/services/daily-ticket-api.service';
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
  const socketRef = useRef<any>(null);

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
          // Seleccionar la primera ruta por defecto si existe como guía
          if (loadedRoutes.length > 0) {
            setSelectedRouteId(loadedRoutes[0].id);
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
      }));

      setVehicles(formattedPositions);
    });

    socket.on('notification', (notif: ActiveNotification) => {
      setActiveNotification(notif);
      playAlertSound(notif.type);

      // Auto-ocultar: 10 segundos para multas, 5 segundos para otros avisos
      const duration = notif.type === 'INFRACTION' ? 10000 : 5000;
      setTimeout(() => {
        setActiveNotification(prev => prev?.id === notif.id ? null : prev);
      }, duration);
    });
  };

  // 4. Buscar el vehículo asignado a este chofer de forma reactiva por su ID de usuario único
  const myVehicle = vehicles.find(
    v => v.driverId === driverId
  );

  // Si no se encuentra un vehículo asignado al chofer en tiempo real, podemos mostrar el primero de la lista para testing/demo
  const activeVehicle = myVehicle || (vehicles.length > 0 ? vehicles[0] : null);

  // Sincronizar automáticamente la ruta seleccionada con la asignada en el ticket de salida en caliente
  useEffect(() => {
    if (activeVehicle && activeVehicle.routeId) {
      setSelectedRouteId(activeVehicle.routeId);
    }
  }, [activeVehicle?.routeId]);

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

  // Filtrar vehículos para pasar al mapa: en modo chofer, solo mostramos SU vehículo asignado
  const mapVehicles = activeVehicle ? [activeVehicle] : [];

  // Obtener la ruta seleccionada para guiar al chofer en el mapa
  const selectedRoute = Array.isArray(routes) ? routes.find(r => r.id === selectedRouteId) : undefined;
  const routeOutboundCoords = selectedRoute?.outboundCoordinates || [];
  const routeInboundCoords = selectedRoute?.inboundCoordinates || [];
  const routeStops = selectedRoute?.stops?.map((stop: any) => {
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
      name: stop.name || `Paradero ${stop.stopOrder}`,
      lat,
      lng,
      stopOrder: stop.stopOrder,
      minutesFromStart: stop.minutesFromStart || 0,
      polygonCoordinates,
    };
  }) || [];

  return (
    <DashboardLayout noPadding={true} hideBottomNav={true}>
      <div className={styles.container}>
        {/* Toast de Notificación Premium con Glassmorphism */}
        {activeNotification && (
          <div 
            className={`${styles.notificationToast} ${
              activeNotification.type === 'INFRACTION' ? styles.toastInfraction : styles.toastSuccess
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
              {activeVehicle && !isCollapsed && (
                <span className={`${styles.statusBadge} ${activeVehicle.isActive ? styles.statusActive : styles.statusStopped}`}>
                  {activeVehicle.isActive ? 'En ruta' : 'Detenido'}
                </span>
              )}
              
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
                        <span className={styles.detailValue}>{activeVehicle.speed} km/h</span>
                      </div>
                    </div>

                    {/* Detalle 3: Sentido de la marcha (Ida o Vuelta) */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: activeVehicle.direction === 'VUELTA' ? '#ef4444' : '#2563eb', fontSize: '18px' }}>
                        {activeVehicle.direction === 'VUELTA' ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Sentido de Marcha</span>
                        <span className={`${styles.detailValue} ${activeVehicle.direction === 'VUELTA' ? styles.directionReturn : styles.directionGo}`}>
                          {activeVehicle.direction === 'VUELTA' ? 'Retorno / Vuelta' : 'Salida / Ida'}
                        </span>
                      </div>
                    </div>

                    {/* Detalle 4: Ruta Asignada Estática (Al costado del Sentido de Marcha) */}
                    <div className={styles.detailItem}>
                      <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '18px' }}>
                        route
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.detailLabel}>Ruta Asignada</span>
                        <span className={styles.detailValue} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {selectedRoute ? selectedRoute.name : 'Sin ruta activa'}
                        </span>
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
                  <span className={styles.noVehicleText}>No tienes ninguna unidad asignada hoy</span>
                  <span className={styles.noVehicleSubtext}>Espera a que el controlador emita tu ticket de salida en el dashboard.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
