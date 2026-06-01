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
        setRoutes(data.routes || []);
        
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

      {/* Panel Superior Flotante Premium de Branding */}
      <div className="absolute top-4 left-4 z-[999] flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/60 px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-950/40">
        <div 
          className="w-3.5 h-3.5 rounded-full animate-ping"
          style={{ backgroundColor: colors.primary }}
        ></div>
        <div className="flex flex-col">
          <h1 className="text-xs font-bold text-slate-100 tracking-wide uppercase">{tenantName}</h1>
          <span className="text-[10px] text-slate-400 font-medium">Buses en servicio y ruta en vivo</span>
        </div>
      </div>

      {/* Selector de Ruta Flotante Minimalista */}
      {routes.length > 0 && (
        <div className="absolute bottom-6 left-4 z-[999] bg-slate-950/80 backdrop-blur-md border border-slate-800/60 p-3 rounded-2xl shadow-xl shadow-slate-950/40 max-w-[280px]">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-2">Seleccionar Recorrido</span>
          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedRouteId(null)}
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all text-left ${
                selectedRouteId === null
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                  : 'bg-slate-900/60 border-slate-800/40 text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span>Ver todas las rutas</span>
              <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-slate-400">
                {vehicles.length}
              </span>
            </button>
            
            {routes.map((route) => {
              const routeVehs = vehicles.filter((v) => v.routeId === route.id);
              const isSelected = selectedRouteId === route.id;
              
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-slate-900/60 border-slate-800/40 text-slate-300 hover:bg-slate-800/50'
                  }`}
                  style={isSelected ? { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}50`, color: colors.primary } : {}}
                >
                  <span className="truncate pr-2">{route.name}</span>
                  <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-slate-400">
                    {routeVehs.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
