'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
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
  lat: number;
  lng: number;
  speed: number;
  isActive: boolean;
  lastUpdated: string;
  dailyTicketId?: string | null;
  hasActiveTicket?: boolean;
}

export default function FleetMonitoringPage() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);

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

    // 4. Escuchar las ráfagas de geolocalización satelital enriquecida
    socket.on('positions', (positionsData: any[]) => {
      // Mapear los datos de posiciones recibidos del backend a la interfaz del mapa
      const formattedPositions: VehiclePosition[] = positionsData.map(pos => ({
        id: pos.vehicleId || pos.deviceId,
        plate: pos.plate || `Vehículo ${pos.deviceId}`,
        driverName: pos.driverName || 'No asignado',
        lat: parseFloat(pos.latitude || pos.lat),
        lng: parseFloat(pos.longitude || pos.lng),
        speed: Math.round(pos.speed || 0),
        isActive: pos.speed > 0 || pos.attributes?.motion || false,
        lastUpdated: pos.deviceTime || pos.lastUpdated || new Date().toISOString(),
        dailyTicketId: pos.dailyTicketId,
        hasActiveTicket: pos.hasActiveTicket,
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
    <DashboardLayout>
      <div className={styles.container}>
        {/* Barra de estado de conexión flotante sobre el mapa */}
        <div className={styles.connectionStatus}>
          <span className={`${styles.statusDot} ${isConnected ? styles.dotConnected : styles.dotDisconnected}`} />
          {isConnected ? 'Telemetría activa' : 'Reconectando telemetría...'}
        </div>

        <div className={styles.mainLayout}>
          {/* Panel Lateral: Listado & Controles de Filtros */}
          <div className={`${styles.leftPanel} ${isMapExpanded ? styles.leftPanelHidden : ''}`}>
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
                    >
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

                      <div className={styles.statusBadges}>
                        <span className={`${styles.ticketBadge} ${vehicle.hasActiveTicket ? styles.ticketPaid : styles.ticketPending}`}>
                          {vehicle.hasActiveTicket ? 'Pagado' : 'Pendiente'}
                        </span>
                        {vehicle.isActive && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                            <span className={styles.activeStatusIndicator} style={{ backgroundColor: '#10b981' }} />
                            En ruta
                          </span>
                        )}
                      </div>
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
              <div className={styles.floatingControlPanel}>
                <h3 className={styles.floatingPanelTitle}>
                  <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '20px' }}>directions_bus</span>
                  Panel de Monitoreo
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
