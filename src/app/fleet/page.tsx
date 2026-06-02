'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { DailyTicketApiService } from '@/app/features/admin/services/daily-ticket-api.service';
import styles from './Fleet.module.css';

// Importación dinámica de GpsMap para evitar fallos de compilación Server-Side (Leaflet/DOM dependency)
const GpsMap = dynamic(
  () => import('@/shared/components/maps/gps-map.component'),
  { ssr: false }
);

interface VehiclePosition {
  id: string;
  plate: string;
  driverName?: string;
  driverId?: string | null; // ID único del conductor
  lat: number;
  lng: number;
  speed: number;
  isActive: boolean;
  lastUpdated: string;
  dailyTicketId?: string | null;
  hasActiveTicket?: boolean;
  roundId?: string | null;
  roundStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null;
  hasPendingInfractions?: boolean;
  direction?: 'IDA' | 'VUELTA' | null;
}

export default function FleetMonitoringPage() {
  const { success: showSuccess, error: showError } = useToast();
  const ticketApiService = useMemo(() => new DailyTicketApiService(), []);

  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);

  // Estados del Panel de Monitoreo Flotante en Pantalla Completa
  const [panelPosition, setPanelPosition] = useState({ x: 16, y: 70 });
  const [isPanelVehiclesListOpen, setIsPanelVehiclesListOpen] = useState(false);

  // Estados de control móvil (Bottom Sheet interactivo)
  const [isListExpandedMobile, setIsListExpandedMobile] = useState<boolean>(false);

  // Referencias para la gestión de arrastre (Drag and Drop nativo ultra fluido a 60 FPS)
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panelPositionRef = useRef(panelPosition);

  // Mantener la referencia de posición actualizada de forma síncrona para los callbacks globales
  useEffect(() => {
    panelPositionRef.current = panelPosition;
  }, [panelPosition]);

  // Gestor de arrastre con mouse (Escritorio)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo permitir arrastrar con botón izquierdo del mouse

    // Cancelar arrastre si el evento proviene de un control interactivo (select, button, input)
    const target = e.target as HTMLElement;
    if (target.closest('select') || target.closest('button') || target.closest('input')) {
      return;
    }

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - panelPositionRef.current.x,
      y: e.clientY - panelPositionRef.current.y
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Evitar seleccionar texto por accidente al arrastrar
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    let newX = e.clientX - dragOffsetRef.current.x;
    let newY = e.clientY - dragOffsetRef.current.y;

    const mapWidth = window.innerWidth;
    const mapHeight = window.innerHeight;

    // Mantener el panel dentro de los límites visuales de la pantalla (con márgenes de seguridad)
    newX = Math.max(8, Math.min(newX, mapWidth - 300));
    newY = Math.max(8, Math.min(newY, mapHeight - 200));

    setPanelPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Gestor de arrastre táctil (Dispositivos Móviles y Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('select') || target.closest('button') || target.closest('input')) {
      return;
    }

    const touch = e.touches[0];
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: touch.clientX - panelPositionRef.current.x,
      y: touch.clientY - panelPositionRef.current.y
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault(); // Prevenir el desplazamiento vertical elástico de la página web en móviles

    const touch = e.touches[0];
    let newX = touch.clientX - dragOffsetRef.current.x;
    let newY = touch.clientY - dragOffsetRef.current.y;

    const mapWidth = window.innerWidth;
    const mapHeight = window.innerHeight;

    newX = Math.max(8, Math.min(newX, mapWidth - 300));
    newY = Math.max(8, Math.min(newY, mapHeight - 200));

    setPanelPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Carga e inicialización dinámica de Socket.io-client desde CDN
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
  }, []);

  // Fetch de Rutas registradas del Tenant
  useEffect(() => {
    const fetchRoutes = async () => {
      const sessionStr = Cookies.get('gps_central_session');
      if (!sessionStr) {
        console.error('[Rutas] No se encontró ninguna sesión activa en las cookies.');
        return;
      }

      let token = '';
      try {
        const session = JSON.parse(sessionStr);
        token = session.token || '';
      } catch (e) {
        console.error('[Rutas] Error al parsear los datos de sesión de la cookie', e);
        return;
      }

      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

      try {
        const res = await fetch(`${apiUrl}/routes/list`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const apiResponse = await res.json();
          const loadedRoutes = apiResponse.data || [];
          setRoutes(loadedRoutes);
          if (loadedRoutes.length > 0) {
            setSelectedRouteId(loadedRoutes[0].id);
          }
        } else {
          console.error('[Rutas] Error al consultar la lista de rutas del tenant:', res.status);
        }
      } catch (err) {
        console.error('[Rutas] Excepción al cargar la lista de rutas:', err);
      }
    };

    fetchRoutes();
  }, []);

  const initializeSocket = () => {
    // 1. Extraer JWT desde la cookie de sesión del frontend
    const sessionStr = Cookies.get('gps_central_session');
    if (!sessionStr) {
      console.error('[Websocket] No se encontró ninguna sesión activa en las cookies.');
      return;
    }

    let token = '';
    try {
      const session = JSON.parse(sessionStr);
      token = session.token || '';
    } catch (e) {
      console.error('[Websocket] Error al parsear los datos de sesión de la cookie', e);
      return;
    }

    if (!token) {
      console.error('[Websocket] No se halló token JWT en los datos de la sesión.');
      return;
    }

    // 2. Calcular endpoint base del websocket a partir de la API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const socketUrl = apiUrl.replace('/api/v1', '').replace('/api/v1/', '');

    const io = (window as any).io;
    if (!io) {
      console.error('[Websocket] La librería Socket.io no pudo cargarse desde el CDN.');
      return;
    }

    // 3. Establecer conexión WebSocket pasando el token en el handshake
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Websocket] Conectado exitosamente al gateway con ID: ${socket.id}`);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Websocket] Desconectado del gateway.');
      setIsConnected(false);
    });

    socket.on('connect_error', (err: any) => {
      console.error('[Websocket] Error de conexión:', err.message);
      setIsConnected(false);
    });

    socket.on('positions', (positionsData: any[]) => {
      // Mapear los datos de posiciones recibidos del backend a la interfaz del mapa
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
        roundId: pos.roundId || null,
        roundStatus: pos.roundStatus || null,
        hasPendingInfractions: pos.hasPendingInfractions || false,
        direction: pos.direction || null,
      }));

      setVehicles(prevVehicles => {
        // Combinar datos anteriores y nuevos para conservar información estable
        const updatedMap = new Map<string, VehiclePosition>();
        prevVehicles.forEach(v => updatedMap.set(v.id, v));
        formattedPositions.forEach(v => updatedMap.set(v.id, v));
        return Array.from(updatedMap.values());
      });
    });
  };

  const handleStartRound = async (roundId: string) => {
    try {
      const res = await ticketApiService.startRound(roundId);
      if (res.success) {
        showSuccess('Ruta iniciada', 'La unidad ha salido de la terminal con éxito.');
      } else {
        showError('Error al iniciar ruta', res.errorMessage || 'No se pudo iniciar el recorrido.');
      }
    } catch (err: any) {
      showError('Error de red', 'No se pudo comunicar con el servidor.');
    }
  };

  const handleCompleteRound = async (roundId: string) => {
    if (!confirm('¿Estás seguro de completar este viaje de forma manual? Usa esto solo si el GPS está fallando.')) {
      return;
    }
    try {
      const res = await ticketApiService.completeRound(roundId);
      if (res.success) {
        showSuccess('Ruta completada', 'El viaje ha sido cerrado manualmente con éxito.');
      } else {
        showError('Error al completar ruta', res.errorMessage || 'No se pudo completar el recorrido.');
      }
    } catch (err: any) {
      showError('Error de red', 'No se pudo comunicar con el servidor.');
    }
  };

  const handleCloseWorkday = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de finalizar la jornada laboral de este conductor? Esto completará su viaje y retirará al vehículo de monitoreo.')) {
      return;
    }
    try {
      const res = await ticketApiService.closeWorkday(ticketId);
      if (res.success) {
        showSuccess('Jornada finalizada', 'El ticket diario ha sido cerrado y el vehículo desactivado.');
      } else {
        showError('Error al finalizar jornada', res.errorMessage || 'No se pudo cerrar la jornada laboral.');
      }
    } catch (err: any) {
      showError('Error de red', 'No se pudo comunicar con el servidor.');
    }
  };

  // Filtrado local e interactivo de vehículos en tiempo real
  const filteredVehicles = vehicles.filter(v => {
    if (filterMode === 'paid') return v.hasActiveTicket === true;
    if (filterMode === 'unpaid') return v.hasActiveTicket === false;
    return true; // Mode 'all'
  });

  const handleCardClick = (vehicleId: string) => {
    setActiveVehicleId(vehicleId);
  };

  // Obtener detalles de la ruta seleccionada para el mapa
  const selectedRoute = Array.isArray(routes) ? routes.find(r => r.id === selectedRouteId) : undefined;
  const routeOutboundCoords = selectedRoute?.outboundCoordinates || [];
  const routeInboundCoords = selectedRoute?.inboundCoordinates || [];
  const routeStops = selectedRoute?.stops?.map((stop: any) => {
    let lat = 0;
    let lng = 0;
    let polygonCoordinates = undefined;

    if (stop.coordinates && stop.coordinates.length > 0) {
      polygonCoordinates = stop.coordinates;
      // Calcular el centroide geométrico de las coordenadas del paradero
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
      <div className={`${styles.container} ${isMapExpanded ? styles.containerExpanded : ''}`}>
        {/* Barra de estado de conexión flotante sobre el mapa */}
        <div className={styles.connectionStatus}>
          <span className={`${styles.statusDot} ${isConnected ? styles.dotConnected : styles.dotDisconnected}`} />
          {isConnected ? 'Telemetría activa' : 'Reconectando telemetría...'}
        </div>

        <div className={styles.mainLayout}>
          {/* Panel Lateral: Listado & Controles de Filtros */}
          <div className={`${styles.leftPanel} ${isMapExpanded ? styles.leftPanelHidden : ''} ${isListExpandedMobile ? styles.leftPanelMobileExpanded : ''}`}>
            {/* Tirador Móvil para Expandir/Colapsar (PWA Bottom Sheet Style) */}
            <div
              className={styles.mobileDragHandleContainer}
              onClick={() => setIsListExpandedMobile(!isListExpandedMobile)}
            >
              <div className={styles.mobileDragHandle} />
              <span className={styles.mobileDragHandleText}>
                {isListExpandedMobile ? 'Ocultar Unidades' : 'Mostrar Unidades'}
              </span>
            </div>

            <div className={styles.headerSection}>
              <h2 className={styles.titleText}>
                <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '24px' }}>directions_bus</span>
                Monitoreo de Flota
              </h2>
              <p className={styles.titleDescription}>
                Ubicaciones en tiempo real para el control de salidas y recaudación.
              </p>
            </div>

            {/* Selector de Ruta de la Empresa */}
            <div className={styles.routeSelectorContainer}>
              <span className={styles.filterLabel}>SELECCIONAR RUTA DE LA EMPRESA</span>
              <select
                className={styles.selectInput}
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
              >
                <option value="">-- Sin trazado de ruta en mapa --</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Filtros estilo Chips Premium (Vectura Style) */}
            <div className={styles.filterContainer}>
              <span className={styles.filterLabel}>FILTRAR POR ESTADO DE SALIDA</span>
              <div className={styles.filterChips}>
                <button
                  type="button"
                  className={`${styles.chip} ${filterMode === 'all' ? styles.chipActive : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  Todos ({vehicles.length})
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${filterMode === 'paid' ? styles.chipActive : ''}`}
                  onClick={() => setFilterMode('paid')}
                >
                  Pagados ({vehicles.filter(v => v.hasActiveTicket === true).length})
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${filterMode === 'unpaid' ? styles.chipActive : ''}`}
                  onClick={() => setFilterMode('unpaid')}
                >
                  No Pagados ({vehicles.filter(v => v.hasActiveTicket === false).length})
                </button>
              </div>
            </div>

            {/* Listado de Unidades */}
            <div className={styles.vehicleList}>
              {filteredVehicles.length === 0 ? (
                <div className={styles.emptyList}>
                  <span className={`material-symbols-rounded ${styles.emptyIcon}`}>
                    info_i
                  </span>
                  <h4 className={styles.emptyTitle}>Ningún autobús coincide</h4>
                  <p className={styles.emptyDesc}>
                    No hay unidades activas registradas bajo este estado de salida en este momento.
                  </p>
                </div>
              ) : (
                filteredVehicles.map(vehicle => {
                  const cardActive = activeVehicleId === vehicle.id;
                  const bgVeh = vehicle.isActive ? '#10b981' : '#64748b';

                  return (
                    <div
                      key={vehicle.id}
                      className={`${styles.vehicleCard} ${cardActive ? styles.vehicleCardActive : ''}`}
                      onClick={() => handleCardClick(vehicle.id)}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div className={styles.vehicleInfo}>
                          {/* Círculo indicador de movimiento */}
                          <div className={styles.iconCircle} style={{ backgroundColor: bgVeh }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                              directions_bus
                            </span>
                          </div>
                          <div className={styles.vehicleText}>
                            <span className={styles.plateText}>{vehicle.plate}</span>
                            <span className={styles.driverText}>Chofer: {vehicle.driverName}</span>
                            <span className={styles.speedText}>Velocidad: {vehicle.speed} km/h</span>
                          </div>
                        </div>

                        <div className={styles.statusBadges} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span className={`${styles.ticketBadge} ${vehicle.hasActiveTicket ? styles.ticketPaid : styles.ticketPending}`}>
                            {vehicle.hasActiveTicket ? 'Pagado' : 'Pendiente'}
                          </span>
                          
                          {vehicle.hasActiveTicket && vehicle.roundStatus && (
                            <span 
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                textTransform: 'uppercase',
                                backgroundColor: vehicle.roundStatus === 'PENDING' ? '#eff6ff' : '#faf5ff',
                                color: vehicle.roundStatus === 'PENDING' ? '#2563eb' : '#7c3aed',
                                border: `1px solid ${vehicle.roundStatus === 'PENDING' ? '#bfdbfe' : '#e9d5ff'}`
                              }}
                            >
                              {vehicle.roundStatus === 'PENDING' ? 'Espera' : 'En Ruta'} - {vehicle.direction}
                            </span>
                          )}

                          {vehicle.hasPendingInfractions && (
                            <span 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '9px',
                                color: '#ef4444',
                                fontWeight: 700,
                                backgroundColor: '#fef2f2',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: '1px solid #fee2e2'
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '10px' }}>warning</span>
                              MULTA
                            </span>
                          )}

                          {vehicle.isActive && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                              <span className={styles.activeStatusIndicator} style={{ backgroundColor: '#10b981' }} />
                              Señal GPS
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Panel de Operaciones en Caliente (Solo visible si la tarjeta está seleccionada/activa) */}
                      {cardActive && vehicle.hasActiveTicket && (
                        <div 
                          className={styles.actionPanel} 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            width: '100%'
                          }}
                        >
                          {vehicle.roundStatus === 'PENDING' && (
                            <div style={{ width: '100%' }}>
                              {vehicle.hasPendingInfractions ? (
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: '#fff5f5',
                                    border: '1px solid #fed7d7',
                                    color: '#c53030',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 600
                                  }}
                                >
                                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>block</span>
                                  Despacho bloqueado por multas pendientes.
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => vehicle.roundId && handleStartRound(vehicle.roundId)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>rocket_launch</span>
                                  Despachar / Iniciar Ruta
                                </button>
                              )}
                            </div>
                          )}

                          {vehicle.roundStatus === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => vehicle.roundId && handleCompleteRound(vehicle.roundId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>sports_score</span>
                              Completar Ruta (Manual)
                            </button>
                          )}

                          {vehicle.dailyTicketId && (
                            <button
                              type="button"
                              onClick={() => vehicle.dailyTicketId && handleCloseWorkday(vehicle.dailyTicketId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                backgroundColor: '#64748b',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>lock</span>
                              Finalizar Jornada Laboral
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel Derecho: Mapa interactivo en pantalla completa */}
          <div className={styles.mapPanel}>
            {/* Botón flotante para maximizar/minimizar el mapa */}
            <button
              type="button"
              className={styles.fullscreenButton}
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              title={isMapExpanded ? 'Minimizar mapa' : 'Maximizar mapa (Pantalla completa)'}
            >
              <span className="material-symbols-rounded">
                {isMapExpanded ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* Tarjeta de Control Flotante Premium en Modo Pantalla Completa */}
            {isMapExpanded && (
              <div
                className={styles.floatingControlPanel}
                style={{
                  left: `${panelPosition.x}px`,
                  top: `${panelPosition.y}px`
                }}
              >
                <h3
                  className={styles.floatingPanelTitle}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  style={{
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none'
                  }}
                  title="Mantén presionado y arrastra para mover el panel"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '20px' }}>directions_bus</span>
                    Panel de Monitoreo
                  </span>
                  <span className="material-symbols-rounded" style={{ color: '#94a3b8', fontSize: '18px', cursor: 'grab' }}>
                    drag_indicator
                  </span>
                </h3>
                <div className={styles.floatingPanelDivider} />

                {/* Control Selector de Ruta Flotante */}
                <div className={styles.floatingPanelSection}>
                  <span className={styles.floatingPanelLabel}>Ruta de la empresa</span>
                  <select
                    className={styles.selectInput}
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                  >
                    <option value="">-- Sin trazado de ruta --</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Control de Filtros Flotante */}
                <div className={styles.floatingPanelSection}>
                  <span className={styles.floatingPanelLabel}>Filtrar salida</span>
                  <div className={styles.filterChips} style={{ gap: '4px' }}>
                    <button
                      type="button"
                      className={`${styles.chip} ${filterMode === 'all' ? styles.chipActive : ''}`}
                      onClick={() => setFilterMode('all')}
                      style={{ padding: '4px 6px', fontSize: '0.65rem' }}
                    >
                      Todos ({vehicles.length})
                    </button>
                    <button
                      type="button"
                      className={`${styles.chip} ${filterMode === 'paid' ? styles.chipActive : ''}`}
                      onClick={() => setFilterMode('paid')}
                      style={{ padding: '4px 6px', fontSize: '0.65rem' }}
                    >
                      Pagos ({vehicles.filter(v => v.hasActiveTicket === true).length})
                    </button>
                    <button
                      type="button"
                      className={`${styles.chip} ${filterMode === 'unpaid' ? styles.chipActive : ''}`}
                      onClick={() => setFilterMode('unpaid')}
                      style={{ padding: '4px 6px', fontSize: '0.65rem' }}
                    >
                      Pend. ({vehicles.filter(v => v.hasActiveTicket === false).length})
                    </button>
                  </div>
                </div>

                {/* Botón Plegable para Listar Unidades */}
                <div className={styles.floatingPanelSection} style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPanelVehiclesListOpen(!isPanelVehiclesListOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--outline-variant, #e2e8f0)',
                      backgroundColor: 'var(--surface-container-low, #f8fafc)',
                      color: 'var(--on-surface, #1e293b)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#2563eb' }}>format_list_bulleted</span>
                      Listado de Unidades
                    </span>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', transition: 'transform 0.2s ease', transform: isPanelVehiclesListOpen ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </button>

                  {/* Lista de Unidades Desplegable */}
                  {isPanelVehiclesListOpen && (
                    <div style={{
                      marginTop: '8px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '4px',
                      scrollBehavior: 'smooth'
                    }}>
                      {filteredVehicles.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                          No hay unidades para este filtro
                        </div>
                      ) : (
                        filteredVehicles.map((vehicle) => {
                          const isActiveVeh = vehicle.id === activeVehicleId;
                          return (
                            <div
                              key={vehicle.id}
                              onClick={() => setActiveVehicleId(vehicle.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                backgroundColor: isActiveVeh ? 'rgba(37, 99, 235, 0.08)' : 'rgba(248, 250, 252, 0.5)',
                                border: `1px solid ${isActiveVeh ? 'rgba(37, 99, 235, 0.3)' : 'rgba(226, 232, 240, 0.4)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  className={styles.activeStatusIndicator}
                                  style={{
                                    backgroundColor: vehicle.isActive ? '#10b981' : '#64748b',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    flexShrink: 0
                                  }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: isActiveVeh ? '#2563eb' : '#1e293b' }}>
                                    {vehicle.plate}
                                  </span>
                                  <span style={{ fontSize: '9px', color: '#64748b' }}>
                                    {vehicle.speed} km/h
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  backgroundColor: vehicle.hasActiveTicket ? '#dcfce7' : '#fee2e2',
                                  color: vehicle.hasActiveTicket ? '#15803d' : '#b91c1c',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase'
                                }}>
                                  {vehicle.hasActiveTicket ? 'Pagado' : 'Pend.'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <GpsMap
              mode="controller"
              vehicles={filteredVehicles}
              activeVehicleId={activeVehicleId}
              routesCoordinates={routeOutboundCoords}
              alternativeRouteCoordinates={routeInboundCoords}
              stops={routeStops}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
