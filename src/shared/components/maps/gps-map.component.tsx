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
  activeDirection?: 'IDA' | 'VUELTA' | null; // Dirección activa de la ruta asignada en el ticket

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
  activeDirection = null,
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
  const [autoFollow, setAutoFollow] = useState(true);
  const lastPositionsRef = useRef<Map<string, { lat: number; lng: number; bearing: number }>>(new Map());

  // Referencias para las diferentes capas base premium
  const voyagerLayerRef = useRef<any>(null);
  const lightLayerRef = useRef<any>(null);
  const darkLayerRef = useRef<any>(null);
  const osmLayerRef = useRef<any>(null);

  // Estados del selector de capas premium de React
  const [activeLayerId, setActiveLayerId] = useState<'voyager' | 'light' | 'dark' | 'osm'>('voyager');
  const [isLayersOpen, setIsLayersOpen] = useState(false);

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
      mapInstance = L.map(mapContainerRef.current, {
        maxZoom: 22,
      }).setView(center, zoom);
      mapRef.current = mapInstance;

      if (mode === 'driver') {
        mapInstance.on('dragstart', () => {
          setAutoFollow(false);
        });
        mapInstance.on('zoomstart', () => {
          setAutoFollow(false);
        });
      }

      // Definición de las diferentes capas base premium nativas de alta resolución (CartoDB & OSM)
      voyagerLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 22,
        maxNativeZoom: 20,
      });

      lightLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 22,
        maxNativeZoom: 20,
      });

      darkLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 22,
        maxNativeZoom: 20,
      });

      osmLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });

      // Agregar inicialmente al mapa la capa base activa seleccionada en React
      if (activeLayerId === 'voyager') {
        voyagerLayerRef.current.addTo(mapInstance);
      } else if (activeLayerId === 'light') {
        lightLayerRef.current.addTo(mapInstance);
      } else if (activeLayerId === 'dark') {
        darkLayerRef.current.addTo(mapInstance);
      } else if (activeLayerId === 'osm') {
        osmLayerRef.current.addTo(mapInstance);
      }

      // Idioma en Español
      mapInstance.pm.setLang('es');

      // Configuración de controles del mapa
      if (mode === 'admin') {
        const hasRoute = routesCoordinates && routesCoordinates.length > 0;
        mapInstance.pm.addControls({
          position: 'topleft',
          drawPolyline: true,
          drawMarker: false,
          drawPolygon: hasRoute,
          drawRectangle: false,
          drawCircle: false,
          drawCircleMarker: false,
          drawText: false,
          editMode: false,
          dragMode: false,
          cutPolygon: false,
          removalMode: true,
          rotateMode: false,
          scaleMode: false,
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
        // En modos chofer y controlador, removemos por completo todos los controles de Geoman de la interfaz
        if (mapInstance.pm && typeof mapInstance.pm.removeControls === 'function') {
          mapInstance.pm.removeControls();
        }
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

  // 1.3. Sincronización de la capa base activa en tiempo real
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remover capas base existentes si están instanciadas
    voyagerLayerRef.current?.remove();
    lightLayerRef.current?.remove();
    darkLayerRef.current?.remove();
    osmLayerRef.current?.remove();

    // Añadir la capa base seleccionada
    if (activeLayerId === 'voyager' && voyagerLayerRef.current) {
      voyagerLayerRef.current.addTo(map);
    } else if (activeLayerId === 'light' && lightLayerRef.current) {
      lightLayerRef.current.addTo(map);
    } else if (activeLayerId === 'dark' && darkLayerRef.current) {
      darkLayerRef.current.addTo(map);
    } else if (activeLayerId === 'osm' && osmLayerRef.current) {
      osmLayerRef.current.addTo(map);
    }
  }, [mapLoaded, activeLayerId]);

  // 1.5. Habilitar/Deshabilitar dinámicamente controles de paraderos según la existencia del recorrido de la ruta
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mode !== 'admin') return;
    const map = mapRef.current;
    const hasRoute = routesCoordinates && routesCoordinates.length > 0;

    map.pm.addControls({
      drawMarker: false,
      drawPolygon: hasRoute,
      drawRectangle: false,
    });
  }, [mapLoaded, routesCoordinates, mode]);

  // 2. Sincronización dinámica de los datos geográficos ESTÁTICOS (Ruta y Paraderos)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const currentMap = mapRef.current;

    const drawStaticLayers = async () => {
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
        const isHighlighted = activeDirection === 'VUELTA' || activeDirection === null;
        alternativePolylineRef.current = L.polyline(altLatlngs as any, {
          color: isHighlighted ? '#ef4444' : '#94a3b8',
          weight: isHighlighted ? 6 : 4,
          opacity: isHighlighted ? 0.85 : 0.25,
          dashArray: isHighlighted ? undefined : '5, 10',
          lineJoin: 'round',
        }).addTo(currentMap);
      }

      if (routesCoordinates.length > 0) {
        const latlngs = routesCoordinates.map(c => [c.lat, c.lng]);
        const isHighlighted = activeDirection === 'IDA' || activeDirection === null;
        routePolylineRef.current = L.polyline(latlngs as any, {
          color: isHighlighted ? '#2563eb' : '#94a3b8',
          weight: isHighlighted ? 6 : 4,
          opacity: isHighlighted ? 0.85 : 0.25,
          dashArray: isHighlighted ? undefined : '5, 10',
          lineJoin: 'round',
        }).addTo(currentMap);

        if (mode === 'admin') {
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
        let bgStyle = '#2563eb';
        let borderStyle = '#1e3a8a';
        
        if (stop.stopOrder === 1) {
          bgStyle = '#10b981';
          borderStyle = '#064e3b';
        } else if (stop.stopOrder === stops.length) {
          bgStyle = '#ef4444';
          borderStyle = '#7f1d1d';
        }

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

        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 140px;">
            <strong style="color: #1e293b; font-size: 13px; display: block; margin-bottom: 2px;">${stop.name || `Paradero ${stop.stopOrder}`}</strong>
            <span style="color: #64748b; font-size: 11px; display: block;">Orden: ${stop.stopOrder}</span>
            <span style="color: #64748b; font-size: 11px; display: block;">Tiempo: +${stop.minutesFromStart} min</span>
          </div>
        `);

        if (mode === 'admin') {
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

          marker.on('dblclick', () => {
            const updatedStops = stops
              .filter((_, idx) => idx !== index)
              .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
            onStopsChangedRef.current?.(updatedStops);
          });
        }

        stopMarkersRef.current.push(marker);
      });
    };

    drawStaticLayers();
  }, [mapLoaded, routesCoordinates, alternativeRouteCoordinates, stops, activeDirection, mode]);

  // 3. Sincronización dinámica de VEHÍCULOS en tiempo real (Optimizado: setLatLng y rotación)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const currentMap = mapRef.current;

    const syncVehicles = async () => {
      if (!mapRef.current || !mapContainerRef.current) return;
      const L = await import('leaflet');

      const activeIds = new Set(vehicles.map(v => v.id));

      // A. Eliminar marcadores de vehículos que ya no están activos
      for (const [id, marker] of vehicleMarkersRef.current.entries()) {
        if (!activeIds.has(id)) {
          marker.remove();
          vehicleMarkersRef.current.delete(id);
          lastPositionsRef.current.delete(id);
        }
      }

      // Función helper para calcular bearing en grados
      const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const lat1Rad = (lat1 * Math.PI) / 180;
        const lat2Rad = (lat2 * Math.PI) / 180;
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        const brng = (Math.atan2(y, x) * 180) / Math.PI;
        return (brng + 360) % 360;
      };

      // B. Actualizar o crear marcadores para cada vehículo
      vehicles.forEach(vehicle => {
        const existingMarker = vehicleMarkersRef.current.get(vehicle.id);
        const lastPos = lastPositionsRef.current.get(vehicle.id);

        let bearing = lastPos?.bearing || 0;

        if (lastPos) {
          const distanceMoved = Math.sqrt(
            Math.pow(vehicle.lat - lastPos.lat, 2) + Math.pow(vehicle.lng - lastPos.lng, 2)
          );
          if (distanceMoved > 0.00001 && vehicle.speed > 0) {
            bearing = calculateBearing(lastPos.lat, lastPos.lng, vehicle.lat, vehicle.lng);
          }
        }

        lastPositionsRef.current.set(vehicle.id, { lat: vehicle.lat, lng: vehicle.lng, bearing });

        const bgVeh = '#10b981';
        const opacityVeh = vehicle.isActive ? '1' : '0.65';
        const borderVeh = vehicle.isActive ? '2px solid white' : '2px dashed rgba(255,255,255,0.85)';

        // Icono de flecha de navegación para choferes, bus para administradores/controladores
        const iconName = mode === 'driver' ? 'navigation' : 'directions_bus';
        
        // Ajuste de rotación para Material Icons: 'navigation' apunta al noreste (45deg), hay que restarle 45.
        // 'directions_bus' no necesita ajuste
        const rotationAdjustment = iconName === 'navigation' ? -45 : 0;

        const vehicleIconHtml = `
          <div style="
            background-color: ${bgVeh};
            border: ${borderVeh};
            opacity: ${opacityVeh};
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
            <span class="material-symbols-rounded" style="
              font-size: 20px; 
              font-weight: bold;
              display: inline-block;
              transform: rotate(${bearing + rotationAdjustment}deg);
              transition: transform 0.3s ease;
            ">${iconName}</span>
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
        `;

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

        const popupContent = `
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
        `;

        if (existingMarker) {
          existingMarker.setLatLng([vehicle.lat, vehicle.lng]);
          const customIcon = L.divIcon({
            html: vehicleIconHtml,
            className: 'custom-vehicle-icon',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          });
          existingMarker.setIcon(customIcon);
          existingMarker.setPopupContent(popupContent);
        } else {
          const vehicleIcon = L.divIcon({
            html: vehicleIconHtml,
            className: 'custom-vehicle-icon',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          });

          const marker = L.marker([vehicle.lat, vehicle.lng], {
            icon: vehicleIcon,
          }).addTo(currentMap);

          marker.bindPopup(popupContent);
          vehicleMarkersRef.current.set(vehicle.id, marker);
        }

        // Centrado dinámico inteligente respetando el autoFollow del chofer
        if (activeVehicleId && activeVehicleId === vehicle.id && autoFollow) {
          currentMap.setView([vehicle.lat, vehicle.lng], currentMap.getZoom(), { animate: true });
        }
      });
    };

    syncVehicles();
  }, [mapLoaded, vehicles, activeVehicleId, autoFollow, mode]);

  return (
    <div
      className={`vectura-map-container ${mode}-mode`}
      style={{
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

      {/* Botón flotante para recentrar en modo conductor */}
      {mapLoaded && mode === 'driver' && !autoFollow && (
        <button
          type="button"
          onClick={() => {
            setAutoFollow(true);
            const activeVeh = vehicles.find(v => v.id === activeVehicleId);
            if (activeVeh) {
              mapRef.current?.setView([activeVeh.lat, activeVeh.lng], mapRef.current.getZoom(), { animate: true });
            }
          }}
          style={{
            position: 'absolute',
            bottom: '100px',
            right: '16px',
            zIndex: 100,
            width: '120px',
            height: '42px',
            borderRadius: '21px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: '2px solid #ffffff',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
            backdropFilter: 'blur(8px)'
          }}
          title="Recentrar en mi ubicación"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>my_location</span>
          Recentrar
        </button>
      )}

      {/* Selector de Capas Base Premium Personalizado en React */}
      {mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '112px',
          right: '16px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          fontFamily: "'Inter', sans-serif"
        }}>
          {/* Botón activador circular */}
          <button
            type="button"
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: isLayersOpen ? '#2563eb' : 'rgba(255, 255, 255, 0.95)',
              color: isLayersOpen ? '#ffffff' : '#1e293b',
              border: '2px solid #ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(8px)',
              outline: 'none'
            }}
            title="Cambiar mapa base"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px', fontWeight: 'bold' }}>layers</span>
          </button>

          {/* Panel de Opciones Desplegable con Glassmorphism */}
          {isLayersOpen && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '16px',
              padding: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              width: '200px',
              animation: 'fadeInUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: 'top right'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
                display: 'block',
                paddingLeft: '4px'
              }}>Estilo de Mapa</span>
              
              {/* Opción 1: Voyager */}
              <button
                type="button"
                onClick={() => { setActiveLayerId('voyager'); setIsLayersOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeLayerId === 'voyager' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: activeLayerId === 'voyager' ? '#2563eb' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: activeLayerId === 'voyager' ? 600 : 500,
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>map</span>
                Vectura Premium
              </button>

              {/* Opción 2: Light */}
              <button
                type="button"
                onClick={() => { setActiveLayerId('light'); setIsLayersOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeLayerId === 'light' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: activeLayerId === 'light' ? '#2563eb' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: activeLayerId === 'light' ? 600 : 500,
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>wb_sunny</span>
                Vectura Light (Claro)
              </button>

              {/* Opción 3: Dark */}
              <button
                type="button"
                onClick={() => { setActiveLayerId('dark'); setIsLayersOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeLayerId === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: activeLayerId === 'dark' ? '#2563eb' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: activeLayerId === 'dark' ? 600 : 500,
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>dark_mode</span>
                Vectura Dark (Noche)
              </button>

              {/* Opción 4: OSM */}
              <button
                type="button"
                onClick={() => { setActiveLayerId('osm'); setIsLayersOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeLayerId === 'osm' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: activeLayerId === 'osm' ? '#2563eb' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: activeLayerId === 'osm' ? 600 : 500,
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>public</span>
                OpenStreetMap Estándar
              </button>
            </div>
          )}
        </div>
      )}

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
      
      {/* Añadir estilos CSS premium para controles del mapa y animaciones */}
      <style>{`
        /* Ocultar por completo la barra de herramientas de Geoman en modos no administrativos (chofer/controlador) */
        .vectura-map-container:not(.admin-mode) .leaflet-pm-toolbar {
          display: none !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Unificación estética ultra premium de botones de Leaflet Zoom y Geoman */
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-color: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(12px) !important;
          margin-bottom: 12px !important;
          margin-left: 12px !important; /* Despegado elegante del borde izquierdo */
        }

        .leaflet-bar a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          background-color: transparent !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
          color: #334155 !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .leaflet-bar a:hover {
          background-color: rgba(37, 99, 235, 0.08) !important;
          color: #2563eb !important;
        }

        .leaflet-bar a:last-child {
          border-bottom: none !important;
        }

        /* Margen de seguridad superior para armonía visual de controles flotantes en la izquierda */
        .leaflet-top {
          margin-top: 12px !important;
        }

        /* Anulación de bordes y radios en móviles para verdadera pantalla completa de borde a borde */
        @media (max-width: 768px) {
          .vectura-map-container {
            border-radius: 0px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
