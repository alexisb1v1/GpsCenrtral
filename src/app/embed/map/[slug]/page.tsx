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
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', border: '4px solid #334155', borderRadius: '50%' }}></div>
          <div 
            style={{ 
              position: 'absolute', 
              width: '100%', 
              height: '100%', 
              border: '4px solid #10b981', 
              borderTopColor: 'transparent', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          ></div>
        </div>
        <p style={{ marginTop: '16px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>
          Cargando Mapa de Telemetría...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          padding: '24px',
          backgroundColor: '#020617',
          color: '#f1f5f9',
          textAlign: 'center',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(127, 29, 29, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            marginBottom: '16px',
            color: '#ef4444',
            fontSize: '30px',
            fontWeight: 'bold',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          }}
        >
          !
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Monitoreo Restringido</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '400px', lineHeight: '1.6', marginBottom: '24px' }}>{error}</p>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#475569', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '6px 12px', borderRadius: '8px' }}>
          Vectura Telemetry Security Suite v1.2
        </span>
      </div>
    );
  }

  return (
    <main 
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        userSelect: 'none',
        fontFamily: "'Montserrat', sans-serif",
        '--primary-color': colors.primary,
        '--accent-color': colors.accent,
      } as any}
    >
      {/* Contenedor del Mapa Embebido a Pantalla Completa */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
      >
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

      {/* Selector de Ruta Flotante en Desplegable Moderno Premium - Esquina Superior Derecha */}
      {routes.length > 0 && (
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px', // Esquina Superior Derecha para un look despejado y limpio
            zIndex: 9999, // Encima de los controles de Leaflet
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)', // Glassmorphism oscuro premium
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px', // ROUND_EIGHT según diseño.md
            padding: '10px 14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            fontFamily: "'Montserrat', sans-serif"
          }}
        >
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '12px'
            }}
          >
            <i className="fa-solid fa-route"></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '170px' }}>
            <label 
              style={{ 
                fontSize: '8px', 
                fontWeight: 700, 
                color: '#64748b', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em',
                marginBottom: '2px', 
                lineHeight: 1 
              }}
            >
              Recorrido de Ruta
            </label>
            <select
              value={selectedRouteId || ''}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                fontFamily: "'Montserrat', sans-serif",
                paddingRight: '22px',
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='%2394a3b8'><path d='M7 10l5 5 5-5z'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '16px',
              }}
            >
              {routes.map((route) => {
                const routeVehs = vehicles.filter((v) => v.routeId === route.id);
                return (
                  <option key={route.id} value={route.id} style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
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
