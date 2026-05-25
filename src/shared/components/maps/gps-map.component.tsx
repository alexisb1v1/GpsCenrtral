'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// Interfaces de dominio para el mapa
export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapStop {
  geofenceId?: string;
  name?: string;
  lat: number;
  lng: number;
  stopOrder: number;
  minutesFromStart: number;
  polygonCoordinates?: MapCoordinate[]; // Vértices si fue dibujado como polígono/rectángulo
}

export interface MapVehicle {
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

export interface GpsMapProps {
  /**
   * Modos de operación:
   * - 'admin': Creación y edición de rutas/paraderos (Geoman habilitado).
   * - 'driver': Visualiza su propia unidad y su ruta asignada.
   * - 'controller': Visualiza todas las unidades del tenant y rutas/paraderos.
   */
  mode: 'admin' | 'driver' | 'controller';

  // --- DATOS GEOGRÁFICOS ---
  routesCoordinates?: MapCoordinate[]; // Lista de puntos que forman la línea de la ruta
  alternativeRouteCoordinates?: MapCoordinate[]; // Lista de puntos de la otra dirección (guía visual)
  stops?: MapStop[];                  // Lista de paraderos / puntos de control

  // --- MONITOREO EN TIEMPO REAL ---
  vehicles?: MapVehicle[];            // Flota de vehículos (para choferes/controladores)
  activeVehicleId?: string;           // Identificador del vehículo a centrar/seguir

  // --- CONFIGURACIÓN INICIAL ---
  center?: [number, number];          // Centro inicial del mapa [lat, lng]
  zoom?: number;                      // Zoom inicial del mapa

  // --- CALLBACKS (Modo Administrador) ---
  onRouteChanged?: (coordinates: MapCoordinate[]) => void;
  onStopsChanged?: (stops: MapStop[]) => void;
}

export default function GpsMap({
  mode,
  routesCoordinates = [],
  alternativeRouteCoordinates = [],
  stops = [],
  vehicles = [],
  activeVehicleId,
  center = [-8.3845, -74.5532], // Coordenadas por defecto (ej. Base Principal Pucallpa)
  zoom = 15,
  onRouteChanged,
  onStopsChanged,
}: GpsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Referencia mutable para tener siempre los paraderos frescos y evitar bugs de clausura
  const stopsRef = useRef<MapStop[]>(stops);
  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  // Referencias para evitar bugs de stale closures en los callbacks de Leaflet Geoman
  const onRouteChangedRef = useRef(onRouteChanged);
  const onStopsChangedRef = useRef(onStopsChanged);

  useEffect(() => {
    onRouteChangedRef.current = onRouteChanged;
  }, [onRouteChanged]);

  useEffect(() => {
    onStopsChangedRef.current = onStopsChanged;
  }, [onStopsChanged]);

  // Referencias para capas del mapa y evitar duplicaciones
  const routePolylineRef = useRef<any>(null);
  const alternativePolylineRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<Map<string, any>>(new Map());

  // 1. Inicialización básica del mapa y Leaflet Geoman
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let mapInstance: any = null;

    const initializeMap = async () => {
      const L = await import('leaflet');
      await import('@geoman-io/leaflet-geoman-free');

      // Solución para iconos rotos de Leaflet en Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Evitar doble inicialización o si el contenedor se desmontó durante la carga asíncrona
      if (!mapContainerRef.current || (mapContainerRef.current as any)._leaflet_id) {
        return;
      }

      // Crear mapa
      mapInstance = L.map(mapContainerRef.current).setView(center, zoom);
      mapRef.current = mapInstance;

      // Capa de mapas OpenStreetMap (Mapa premium de calles)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstance);

      // Idioma en Español
      mapInstance.pm.setLang('es');

      // Configuración de controles del mapa
      if (mode === 'admin') {
        const hasRoute = routesCoordinates && routesCoordinates.length > 0;
        mapInstance.pm.addControls({
          position: 'topleft',
          drawMarker: hasRoute,
          drawPolyline: true,
          drawPolygon: hasRoute,
          drawCircle: false,
          drawRectangle: hasRoute,
          editMode: true,
          dragMode: true,
          cutPolygon: false,
          removalMode: true,
        });

        mapInstance.pm.setPathOptions({
          color: '#2563eb', // Azul Vectura
          weight: 5,
          opacity: 0.85,
        });

        // Escuchar la creación de nuevos marcadores, líneas, polígonos o rectángulos
        mapInstance.on('pm:create', (e: any) => {
          const { layer, shape } = e;

          // Si el usuario dibuja una polilínea (Ruta)
          if ((shape === 'Line' || shape === 'Polyline') && onRouteChangedRef.current) {
            const pathPoints = layer.getLatLngs().map((latlng: any) => ({
              lat: latlng.lat,
              lng: latlng.lng,
            }));
            onRouteChangedRef.current(pathPoints);
            layer.remove(); // Eliminamos la capa dibujada temporalmente para que la controle React
          }

          // Si el usuario coloca un marcador, polígono o rectángulo (Paradero)
          if ((shape === 'Marker' || shape === 'Polygon' || shape === 'Rectangle') && onStopsChangedRef.current) {
            let lat = 0;
            let lng = 0;
            let polygonCoordinates: MapCoordinate[] = [];

            if (shape === 'Marker') {
              const latlng = layer.getLatLng();
              lat = latlng.lat;
              lng = latlng.lng;
            } else {
              // Obtener el centro geográfico del polígono/rectángulo
              const center = layer.getBounds().getCenter();
              lat = center.lat;
              lng = center.lng;

              // Obtener vértices para dibujar y persistir en la UI
              const latlngs = layer.getLatLngs();
              const flatLatLngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
              polygonCoordinates = flatLatLngs.map((ll: any) => ({
                lat: ll.lat,
                lng: ll.lng,
              }));
            }

            const currentStopsList = stopsRef.current;
            const newStop: MapStop = {
              name: `Paradero ${currentStopsList.length + 1}`,
              lat,
              lng,
              stopOrder: currentStopsList.length + 1,
              minutesFromStart: currentStopsList.length > 0 ? (currentStopsList[currentStopsList.length - 1].minutesFromStart + 10) : 0,
              polygonCoordinates: polygonCoordinates.length > 0 ? polygonCoordinates : undefined,
            };
            onStopsChangedRef.current([...currentStopsList, newStop]);
            layer.remove(); // Eliminamos el elemento temporal para que React tome el control
          }
        });
      } else {
        // En modos chofer y controlador, deshabilitamos la edición
        mapInstance.pm.addControls({
          position: 'topleft',
          drawMarker: false,
          drawPolyline: false,
          drawPolygon: false,
          drawCircle: false,
          drawRectangle: false,
          editMode: false,
          dragMode: false,
          cutPolygon: false,
          removalMode: false,
        });
      }

      setMapLoaded(true);
    };

    initializeMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, [mode]);

  // 1.5. Habilitar/Deshabilitar dinámicamente controles de paraderos según la existencia del recorrido de la ruta
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mode !== 'admin') return;
    const map = mapRef.current;
    const hasRoute = routesCoordinates && routesCoordinates.length > 0;

    map.pm.addControls({
      drawMarker: hasRoute,
      drawPolygon: hasRoute,
      drawRectangle: hasRoute,
    });
  }, [mapLoaded, routesCoordinates, mode]);

  // 2. Sincronización dinámica de los datos geográficos en el mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const currentMap = mapRef.current;

    const syncLayers = async () => {
      // Si el mapa ya se destruyó o se desmontó en React, cancelamos de inmediato
      if (!mapRef.current || !mapContainerRef.current) return;

      const L = await import('leaflet');

      // --- A. DIBUJAR RUTA (Polilínea) ---
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }

      // --- A.1. DIBUJAR RUTA DE GUÍA ALTERNATIVA (Línea punteada) ---
      if (alternativePolylineRef.current) {
        alternativePolylineRef.current.remove();
        alternativePolylineRef.current = null;
      }

      if (alternativeRouteCoordinates.length > 0) {
        const altLatlngs = alternativeRouteCoordinates.map(c => [c.lat, c.lng]);
        alternativePolylineRef.current = L.polyline(altLatlngs as any, {
          color: '#ef4444', // Rojo Carmín Brillante (Vuelta)
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(currentMap);
      }

      if (routesCoordinates.length > 0) {
        const latlngs = routesCoordinates.map(c => [c.lat, c.lng]);
        routePolylineRef.current = L.polyline(latlngs as any, {
          color: '#2563eb', // Azul Vectura (Ida)
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(currentMap);

        if (mode === 'admin') {
          // Permitir editar el trayecto visualmente
          routePolylineRef.current.pm.enable({
            allowSelfIntersection: false,
          });

          routePolylineRef.current.on('pm:edit', (e: any) => {
            const newCoords = e.target.getLatLngs().map((latlng: any) => ({
              lat: latlng.lat,
              lng: latlng.lng,
            }));
            onRouteChangedRef.current?.(newCoords);
          });
        }
      }

      // --- B. DIBUJAR PARADEROS (Stops) ---
      stopMarkersRef.current.forEach(m => m.remove());
      stopMarkersRef.current = [];

      stops.forEach((stop, index) => {
        let bgStyle = '#2563eb'; // Azul estándar
        let borderStyle = '#1e3a8a';
        
        if (stop.stopOrder === 1) {
          bgStyle = '#10b981'; // Verde inicio
          borderStyle = '#064e3b';
        } else if (stop.stopOrder === stops.length) {
          bgStyle = '#ef4444'; // Rojo fin
          borderStyle = '#7f1d1d';
        }

        // Dibujar el polígono translúcido si existe la geometría del paradero
        if (stop.polygonCoordinates && stop.polygonCoordinates.length > 0) {
          const polygonCoords = stop.polygonCoordinates.map(c => [c.lat, c.lng]);
          const polyLayer = L.polygon(polygonCoords as any, {
            color: bgStyle,
            fillColor: bgStyle,
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
          }).addTo(currentMap);
          stopMarkersRef.current.push(polyLayer);
        }

        // Marcador circular súper premium con número de paradero
        const stopIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${bgStyle};
              border: 2px solid ${borderStyle};
              color: white;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 13px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
              font-family: 'Inter', sans-serif;
            ">${stop.stopOrder}</div>
          `,
          className: 'custom-stop-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([stop.lat, stop.lng], {
          icon: stopIcon,
          draggable: mode === 'admin',
        }).addTo(currentMap);

        // Popup con información estilizada
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 140px;">
            <strong style="color: #1e293b; font-size: 13px; display: block; margin-bottom: 2px;">${stop.name || `Paradero ${stop.stopOrder}`}</strong>
            <span style="color: #64748b; font-size: 11px; display: block;">Orden: ${stop.stopOrder}</span>
            <span style="color: #64748b; font-size: 11px; display: block;">Tiempo: +${stop.minutesFromStart} min</span>
          </div>
        `);

        if (mode === 'admin') {
          // Si el usuario arrastra un paradero en el mapa, actualizamos las coordenadas
          marker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            const updatedStops = [...stops];
            updatedStops[index] = {
              ...updatedStops[index],
              lat,
              lng,
            };
            onStopsChangedRef.current?.(updatedStops);
          });

          // Doble click para eliminar paradero
          marker.on('dblclick', () => {
            const updatedStops = stops
              .filter((_, idx) => idx !== index)
              .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
            onStopsChangedRef.current?.(updatedStops);
          });
        }

        stopMarkersRef.current.push(marker);
      });

      // --- C. DIBUJAR VEHÍCULOS EN TIEMPO REAL ---
      vehicleMarkersRef.current.forEach(m => m.remove());
      vehicleMarkersRef.current.clear();

      vehicles.forEach(vehicle => {
        const bgVeh = vehicle.isActive ? '#10b981' : '#64748b';
        
        const vehicleIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${bgVeh};
              border: 2px solid white;
              color: white;
              border-radius: 50%;
              width: 38px;
              height: 38px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              position: relative;
            ">
              <span class="material-symbols-rounded" style="font-size: 20px; font-weight: bold;">directions_bus</span>
              <div style="
                position: absolute;
                bottom: -20px;
                background-color: rgba(15, 23, 42, 0.9);
                color: white;
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                font-size: 9px;
                padding: 1px 5px;
                border-radius: 4px;
                white-space: nowrap;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              ">${vehicle.plate}</div>
            </div>
          `,
          className: 'custom-vehicle-icon',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([vehicle.lat, vehicle.lng], {
          icon: vehicleIcon,
        }).addTo(currentMap);

        const ticketStatusHtml = vehicle.hasActiveTicket !== undefined 
          ? `
            <p style="margin: 0 0 6px 0; color: #475569; font-size: 12px; display: flex; align-items: center; gap: 4px;">
              <strong>Salida:</strong> 
              <span style="
                background-color: ${vehicle.hasActiveTicket ? '#dcfce7' : '#fee2e2'};
                color: ${vehicle.hasActiveTicket ? '#15803d' : '#b91c1c'};
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
                display: inline-block;
              ">
                ${vehicle.hasActiveTicket ? 'Pagado' : 'Pendiente'}
              </span>
            </p>
          `
          : '';

        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 6px; min-width: 180px;">
            <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 14px; display: flex; align-items: center; gap: 6px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span class="material-symbols-rounded" style="color: #2563eb; font-size: 18px;">directions_bus</span>
              ${vehicle.plate}
            </h4>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px;"><strong>Chofer:</strong> ${vehicle.driverName || 'No asignado'}</p>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px;"><strong>Velocidad:</strong> ${vehicle.speed} km/h</p>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px;"><strong>Movimiento:</strong> <span style="color: ${vehicle.isActive ? '#10b981' : '#64748b'}; font-weight: 600;">${vehicle.isActive ? 'En movimiento' : 'Detenido'}</span></p>
            ${ticketStatusHtml}
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 10px; border-top: 1px solid #f1f5f9; padding-top: 4px;"><strong>Actualizado:</strong> ${new Date(vehicle.lastUpdated).toLocaleTimeString()}</p>
          </div>
        `);

        vehicleMarkersRef.current.set(vehicle.id, marker);

        // Centrado dinámico si es la unidad activa elegida
        if (activeVehicleId && activeVehicleId === vehicle.id) {
          currentMap.setView([vehicle.lat, vehicle.lng], currentMap.getZoom(), { animate: true });
        }
      });
    };

    syncLayers();
  }, [mapLoaded, routesCoordinates, alternativeRouteCoordinates, stops, vehicles, activeVehicleId]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-2xl, 16px)',
      overflow: 'hidden',
      border: '1px solid var(--outline-variant, #c3c6d7)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      backgroundColor: 'var(--background, #f7f9fb)',
      minHeight: '480px'
    }}>
      {/* Contenedor DOM donde se inyecta Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px', zIndex: 1 }} />

      {/* Loader de carga premium mientras Leaflet carga dinámicamente */}
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(247, 249, 251, 0.9)',
          zIndex: 20,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--primary-container, #2563eb)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            marginTop: '12px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--on-surface-variant, #434655)'
          }}>Cargando mapa interactivo de Vectura...</p>
        </div>
      )}
      
      {/* Añadir animación spin si no está definida globalmente */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
