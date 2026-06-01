'use client';

import { useEffect, useRef, useState, use } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// Cargar dinámicamente el componente de Leaflet (GpsMap) para evitar errores de SSR en Next.js
const GpsMap = dynamic(
  () => import('@/shared/components/maps/gps-map.component'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-slate-900 text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-400">Cargando mapa en vivo...</p>
      </div>
    )
  }
);

interface EmbedPageProps {
  params: Promise<{ slug: string }>;
}

export default function EmbedMapPage({ params }: EmbedPageProps) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const routeIdParam = searchParams.get('routeId');

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('Vectura');
  const [colors, setColors] = useState({ primary: '#10b981', accent: '#047857' });
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routeIdParam);

  const socketRef = useRef<any>(null);

  // 1. Cargar datos del widget público desde el backend
  useEffect(() => {
    const fetchWidgetData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/public/monitoring/${slug}`);
        
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Acceso no autorizado: Este dominio no está permitido para embeber este mapa.');
          }
          if (res.status === 404) {
            throw new Error('El mapa de monitoreo solicitado no existe o no está activo.');
          }
          throw new Error('Ocurrió un error al cargar la información del mapa de monitoreo.');
        }

        const data = await res.json();
        
        setTenantName(data.tenantName);
        setColors({
          primary: data.primaryColor || '#10b981',
          accent: data.accentColor || '#047857',
        });
        const fetchedRoutes = data.routes || [];
        setRoutes(fetchedRoutes);
        
        // Seleccionar automáticamente la primera ruta si no está parametrizada en la URL
        if (fetchedRoutes.length > 0 && !routeIdParam) {
          setSelectedRouteId(fetchedRoutes[0].id);
        }
        
        // Formatear vehículos recibidos inicialmente
        const formattedVehs = (data.vehicles || []).map((v: any) => ({
          id: v.vehicleId,
          plate: v.plate,
          lat: v.lat,
          lng: v.lng,
          speed: v.speed || 0,
          isActive: v.speed > 0,
          lastUpdated: v.lastUpdate || new Date().toISOString(),
        }));
        setVehicles(formattedVehs);
      } catch (err: any) {
        console.error('[Embed] Error al cargar los datos del mapa público:', err);
        setError(err.message || 'Error de conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchWidgetData();
  }, [slug]);

  // 2. Conectar por WebSocket para recibir geolocalización en vivo
  useEffect(() => {
    if (loading || error) return;

    // Cargar script de socket.io desde el CDN si no está cargado
    const loadSocketScript = () => {
      if ((window as any).io) {
        initializeSocket();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.async = true;
      script.onload = () => initializeSocket();
      script.onerror = () => console.error('[Embed WS] No se pudo cargar la librería Socket.io.');
      document.body.appendChild(script);
    };

    const initializeSocket = () => {
      const io = (window as any).io;
      if (!io) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const socketUrl = apiUrl.replace('/api/v1', '').replace('/api/v1/', '');

      // Conexión anónima enviando publicTenantSlug en query
      const socket = io(socketUrl, {
        query: { publicTenantSlug: slug },
        transports: ['websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 5000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log(`[Embed WS] Conectado exitosamente en vivo. ID: ${socket.id}`);
      });

      socket.on('disconnect', () => {
        console.log('[Embed WS] Desconectado del WebSocket.');
      });

      // Escuchar las coordenadas enriquecidas en vivo
      socket.on('positions', (positionsData: any[]) => {
        if (!Array.isArray(positionsData)) return;

        setVehicles((currentVehicles) => {
          const updated = [...currentVehicles];
          
          positionsData.forEach((newPos) => {
            const index = updated.findIndex((v) => v.id === newPos.vehicleId);
            
            const mappedVeh = {
              id: newPos.vehicleId,
              plate: newPos.plate || `Bus`,
              lat: newPos.lat,
              lng: newPos.lng,
              speed: newPos.speed || 0,
              isActive: (newPos.speed || 0) > 0,
              lastUpdated: newPos.lastUpdate || new Date().toISOString(),
            };

            if (index !== -1) {
              updated[index] = mappedVeh;
            } else {
              updated.push(mappedVeh);
            }
          });

          return updated;
        });
      });
    };

    loadSocketScript();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [loading, error, slug]);

  // Sincronizar el query param ?routeId si cambia externamente
  useEffect(() => {
    if (routeIdParam) {
      setSelectedRouteId(routeIdParam);
    }
  }, [routeIdParam]);

  // Filtrar rutas y vehículos según la selección en la UI
  const filteredRoute = selectedRouteId 
    ? routes.find((r) => r.id === selectedRouteId) 
    : null;

  const displayVehicles = selectedRouteId
    ? vehicles.filter((v) => v.routeId === selectedRouteId)
    : vehicles;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-900 text-slate-100">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute w-full h-full border-4 border-slate-700 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400 uppercase animate-pulse">Cargando Mapa del Tenant...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen p-6 bg-slate-950 text-slate-200 text-center font-sans">
        <div className="flex items-center justify-center w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-2xl mb-4 text-red-500 shadow-lg shadow-red-950/20">
          <span className="material-symbols-rounded text-3xl font-bold">lock_open</span>
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">Monitoreo Restringido</h3>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">{error}</p>
        <span className="text-[11px] font-mono text-slate-600 bg-slate-900/60 border border-slate-800/40 px-3 py-1.5 rounded-lg">Vectura Telemetry Security Suite v1.1</span>
      </div>
    );
  }

  return (
    <main 
      className="relative w-full h-screen bg-slate-900 overflow-hidden select-none font-sans"
      style={{
        '--primary-color': colors.primary,
        '--accent-color': colors.accent,
      } as any}
    >
      {/* Contenedor del Mapa Embebido */}
      <div className="w-full h-full z-1">
        <GpsMap
          mode="controller"
          routesCoordinates={filteredRoute ? filteredRoute.outboundCoordinates : []}
          alternativeRouteCoordinates={filteredRoute ? filteredRoute.inboundCoordinates : []}
          stops={filteredRoute ? filteredRoute.stops.map((s: any) => ({
            geofenceId: s.id,
            name: s.name,
            lat: s.coordinates[0].lat,
            lng: s.coordinates[0].lng,
            stopOrder: s.stopOrder,
            minutesFromStart: s.minutesFromStart || 0,
          })) : []}
          vehicles={displayVehicles}
          zoom={14}
        />
      </div>

      {/* Selector de Ruta Flotante en Desplegable Moderno Premium */}
      {routes.length > 0 && (
        <div 
          className="absolute top-4 left-4 z-[999] flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-2.5 px-3.5 shadow-xl shadow-slate-950/40 select-none"
          style={{
            borderRadius: '8px', // ROUND_EIGHT según diseño.md
            fontFamily: "'Montserrat', sans-serif"
          }}
        >
          <div 
            className="flex items-center justify-center w-7 h-7 rounded-md border text-xs"
            style={{ 
              backgroundColor: `${colors.primary}12`, 
              borderColor: `${colors.primary}30`,
              color: colors.primary 
            }}
          >
            <i className="fa-solid fa-route"></i>
          </div>
          <div className="flex flex-col min-w-[160px]">
            <label className="text-[8px] font-bold text-slate-500 tracking-wider uppercase block mb-0.5 leading-none">
              Recorrido de Ruta
            </label>
            <select
              value={selectedRouteId || ''}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="bg-transparent text-slate-100 text-[11px] font-bold border-none outline-none cursor-pointer w-full pr-6 py-0.5 appearance-none focus:ring-0 leading-tight focus:outline-none"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='%2394a3b8'><path d='M7 10l5 5 5-5z'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '16px',
              }}
            >
              {routes.map((route) => {
                const routeVehs = vehicles.filter((v) => v.routeId === route.id);
                return (
                  <option key={route.id} value={route.id} className="bg-slate-950 text-slate-200">
                    {route.name} ({routeVehs.length} en servicio)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}
    </main>
  );
}
