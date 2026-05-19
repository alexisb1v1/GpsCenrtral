/* src/app/admin/routes/[id]/stops/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getRouteDetailUseCase, updateRouteStopsUseCase, Route } from '@/app/features/route';
import { getGeofencesListUseCase, Geofence } from '@/app/features/geofence';
import { useToast } from '@/app/shared/providers/ToastProvider';
import styles from './Stops.module.css';

// Importación dinámica de GpsMap para evitar errores de Server-Side Rendering (Leaflet)
const GpsMap = dynamic(
  () => import('@/shared/components/maps/gps-map.component'),
  { ssr: false }
);

interface ExtendedRouteStop {
  id?: string;
  routeId?: string;
  geofenceId?: string;
  name?: string;
  lat?: number;
  lng?: number;
  stopOrder: number;
  minutesFromStart: number;
  polygonCoordinates?: { lat: number; lng: number }[];
  geofence?: {
    id: string;
    name: string;
    type: string;
    status: string;
    lat?: number;
    lng?: number;
  };
}

export default function RouteStopsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { success: showSuccess, error: showError } = useToast();

  const [route, setRoute] = useState<Route | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [currentStops, setCurrentStops] = useState<ExtendedRouteStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Sin guardar');
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);

  // Estados editables del formulario
  const [routeName, setRouteName] = useState('');
  const [routeStatus, setRouteStatus] = useState<boolean>(true);

  // Modal para agregar por coordenadas
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalStopName, setModalStopName] = useState('');
  const [modalLat, setModalLat] = useState('');
  const [modalLng, setModalLng] = useState('');
  const [modalMinutes, setModalMinutes] = useState(10);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    // 1. Cargar detalle de la ruta y sus paraderos actuales
    const routeResult = await getRouteDetailUseCase.execute(id);
    // 2. Cargar geocercas activas del tenant
    const geofencesResult = await getGeofencesListUseCase.execute();

    routeResult.match(
      (routeData) => {
        setRoute(routeData);
        setRouteName(routeData.name);
        setRouteStatus(routeData.isActive);
        setRoutePath(routeData.coordinates || []); // Cargar coordenadas del trayecto de la ruta
        // Ordenar paradas por stopOrder antes de guardarlo en estado
        const sortedStops = [...(routeData.stops || [])].sort((a, b) => a.stopOrder - b.stopOrder);
        
        // Mapear paradas asegurando latitud/longitud e integrando geometrías
        const mappedStops: ExtendedRouteStop[] = sortedStops.map(s => ({
          ...s,
          lat: (s.geofence as any)?.lat ?? (s as any).lat,
          lng: (s.geofence as any)?.lng ?? (s as any).lng,
          name: s.geofence?.name ?? (s as any).name,
          polygonCoordinates: s.polygonCoordinates // Cargar polígono del paradero
        }));
        
        setCurrentStops(mappedStops);
        setLastSaved('Datos recién cargados');
      },
      (err) => {
        showError('Error al cargar la ruta', err.message);
        router.push('/admin/routes');
      }
    );

    geofencesResult.match(
      (geofenceData) => {
        setGeofences(geofenceData.filter(g => g.status === 'ACTIVE'));
      },
      (err) => showError('Error al cargar puntos de control', err.message)
    );

    setIsLoading(false);
  };

  // Re-ordenar paradas al cambiar el valor del input del orden o con botones arriba/abajo
  const moveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentStops.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const list = [...currentStops];
    
    // Intercambiar
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // Actualizar el atributo stopOrder
    const updatedList = list.map((stop, idx) => ({
      ...stop,
      stopOrder: idx + 1
    }));

    setCurrentStops(updatedList);
  };

  const removeStop = (index: number) => {
    const list = currentStops.filter((_, idx) => idx !== index);
    // Re-indexar stopOrder
    const updatedList = list.map((stop, idx) => ({
      ...stop,
      stopOrder: idx + 1
    }));
    setCurrentStops(updatedList);
  };

  const handleMinutesChange = (index: number, minutes: number) => {
    const list = [...currentStops];
    list[index] = {
      ...list[index],
      minutesFromStart: Math.max(0, minutes)
    };
    setCurrentStops(list);
  };

  const handleNameChange = (index: number, name: string) => {
    const list = [...currentStops];
    list[index] = {
      ...list[index],
      name: name,
      geofence: list[index].geofence ? {
        ...list[index].geofence!,
        name: name
      } : undefined
    };
    setCurrentStops(list);
  };

  // Al dibujar, arrastrar o eliminar en el mapa Leaflet
  const handleStopsChangedFromMap = (mapStops: any[]) => {
    const updatedStops = mapStops.map((ms, idx) => {
      const existing = currentStops[idx];
      return {
        id: existing?.id,
        geofenceId: ms.geofenceId || existing?.geofenceId,
        name: ms.name || existing?.geofence?.name || existing?.name || `Paradero ${idx + 1}`,
        lat: ms.lat,
        lng: ms.lng,
        stopOrder: idx + 1,
        minutesFromStart: ms.minutesFromStart ?? existing?.minutesFromStart ?? (idx > 0 ? (currentStops[idx-1]?.minutesFromStart + 10) : 0),
        polygonCoordinates: ms.polygonCoordinates || existing?.polygonCoordinates, // Mantener geometría del polígono/rectángulo
        geofence: ms.geofenceId ? {
          id: ms.geofenceId,
          name: ms.name || existing?.geofence?.name || `Paradero ${idx + 1}`,
          type: idx === 0 ? 'START' : idx === mapStops.length - 1 ? 'END' : 'CHECKPOINT',
          status: 'ACTIVE',
          lat: ms.lat,
          lng: ms.lng
        } : {
          id: '',
          name: ms.name || existing?.name || `Paradero ${idx + 1}`,
          type: idx === 0 ? 'START' : idx === mapStops.length - 1 ? 'END' : 'CHECKPOINT',
          status: 'ACTIVE',
          lat: ms.lat,
          lng: ms.lng
        }
      };
    });
    setCurrentStops(updatedStops);
  };

  // Agregar paradero por coordenadas manualmente (Modal)
  const handleAddStopManual = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(modalLat);
    const lng = parseFloat(modalLng);

    if (isNaN(lat) || isNaN(lng)) {
      showError('Coordenadas inválidas', 'Por favor ingresa números decimales correctos.');
      return;
    }

    const newStop: ExtendedRouteStop = {
      name: modalStopName || `Paradero ${currentStops.length + 1}`,
      lat,
      lng,
      stopOrder: currentStops.length + 1,
      minutesFromStart: modalMinutes,
      geofence: {
        id: '',
        name: modalStopName || `Paradero ${currentStops.length + 1}`,
        type: currentStops.length === 0 ? 'START' : 'CHECKPOINT',
        status: 'ACTIVE',
        lat,
        lng
      }
    };

    setCurrentStops([...currentStops, newStop]);
    setIsAddModalOpen(false);
    
    // Limpiar formulario
    setModalStopName('');
    setModalLat('');
    setModalLng('');
    setModalMinutes(10);
    showSuccess('Paradero añadido', 'Se ha agregado el paradero por coordenadas correctamente.');
  };

  const handleSaveStops = async () => {
    setIsSaving(true);
    
    // Preparar payload para el backend con el formato esperado por RouteStopItemDto
    const payload = currentStops.map(s => ({
      geofenceId: s.geofenceId || undefined,
      name: s.name || s.geofence?.name || `Paradero ${s.stopOrder}`,
      lat: s.geofence?.lat ?? s.lat ?? 0,
      lng: s.geofence?.lng ?? s.lng ?? 0,
      stopOrder: s.stopOrder,
      minutesFromStart: s.minutesFromStart,
      polygonCoordinates: s.polygonCoordinates // Enviar geometría del paradero
    }));

    const result = await updateRouteStopsUseCase.execute(id, payload, routeName, routeStatus, routePath);

    result.match(
      () => {
        showSuccess('Guardado exitoso', 'La ruta y secuencia de paraderos se ha actualizado correctamente.');
        const now = new Date();
        setLastSaved(`Hoy a las ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        loadData(); // Recargar datos frescos
      },
      (err) => {
        showError('Error al guardar', err.message);
      }
    );

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh',
          color: '#475569',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ fontWeight: 600 }}>Cargando configuraciones y paraderos de la ruta...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  // Convertir currentStops al formato MapStop para GpsMap
  const mapStopsFormatted = currentStops.map(s => ({
    geofenceId: s.geofenceId,
    name: s.name || s.geofence?.name,
    lat: s.geofence?.lat ?? s.lat ?? 0,
    lng: s.geofence?.lng ?? s.lng ?? 0,
    stopOrder: s.stopOrder,
    minutesFromStart: s.minutesFromStart,
    polygonCoordinates: s.polygonCoordinates
  }));

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.mainLayout}>
          {/* Columna Izquierda: Detalles & Timeline */}
          <div className={styles.leftPanel}>
            <div className={styles.headerSection}>
              <button onClick={() => router.push('/admin/routes')} className={styles.backBtn}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
                Volver a Rutas
              </button>
              <h2 className={styles.titleText}>
                <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '24px' }}>edit_road</span>
                Editar Ruta
              </h2>
              <p className={styles.titleDescription}>Configura el trayecto y la secuencia de paraderos.</p>
            </div>

            {/* Tarjeta de Detalles de Ruta */}
            <div className={styles.sectionHeader}>
              Detalles de la Ruta
            </div>
            <div className={styles.formCard}>
              <div className={styles.formRow} style={{ marginBottom: 0 }}>
                <div className={styles.formGroup} style={{ marginBottom: 0, flex: 2 }}>
                  <label className={styles.inputLabel}>NOMBRE DE LA RUTA</label>
                  <input 
                    type="text" 
                    className={styles.textInput}
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="Ej. Línea Metropolitana A"
                  />
                </div>
                <div className={styles.formGroup} style={{ marginBottom: 0, flex: 1 }}>
                  <label className={styles.inputLabel}>ESTADO</label>
                  <select 
                    className={styles.selectInput}
                    value={routeStatus ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setRouteStatus(e.target.value === 'ACTIVE')}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Secuencia de Paraderos */}
            <div className={styles.sectionHeader}>
              Puntos de Control / Paraderos
              <span>{currentStops.length} agregados</span>
            </div>

            {currentStops.length === 0 ? (
              <div className={styles.emptyTimeline}>
                <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#94a3b8' }}>playlist_add</span>
                <h4 className={styles.emptyTitle}>Sin paraderos asignados</h4>
                <p className={styles.emptyDesc}>Usa el mapa de la derecha para dibujar paraderos haciendo click o agrégalos por coordenadas.</p>
              </div>
            ) : (
              <div className={styles.stopsContainer}>
                {currentStops.map((stop, index) => (
                  <div key={index} className={styles.stopCard}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div className={styles.dragHandle} title="Arrastrar para ordenar (próximamente)">
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>drag_indicator</span>
                      </div>
                      
                      <div className={styles.stopContent}>
                        <input
                          type="text"
                          className={styles.stopNameInput}
                          value={stop.name || stop.geofence?.name || ''}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          placeholder="Nombre del paradero"
                        />
                        <div className={styles.stopMetaText}>
                          Lat: {Number(stop.geofence?.lat ?? stop.lat ?? 0).toFixed(5)} • Lng: {Number(stop.geofence?.lng ?? stop.lng ?? 0).toFixed(5)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.stopActions}>
                      <div className={styles.minutesBadgeGroup}>
                        <input
                          type="number"
                          className={styles.minutesInput}
                          value={stop.minutesFromStart}
                          onChange={(e) => handleMinutesChange(index, parseInt(e.target.value) || 0)}
                          min="0"
                        />
                        <span className={styles.minutesLabel}>min</span>
                      </div>

                      <button onClick={() => removeStop(index)} className={styles.deleteBtn} title="Eliminar paradero">
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => setIsAddModalOpen(true)} 
              disabled={routePath.length === 0}
              className={styles.addCoordBtn}
              style={{
                opacity: routePath.length === 0 ? 0.55 : 1,
                cursor: routePath.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <span className="material-symbols-rounded">add_location_alt</span>
              Agregar Paradero por Coordenadas
            </button>
          </div>

          {/* Columna Derecha: Mapa Leaflet interactivo */}
          <div className={styles.mapPanel}>
            {routePath.length === 0 ? (
              <div className={styles.mapFloatingTooltip} style={{
                border: '1px solid #f59e0b',
                backgroundColor: 'rgba(253, 230, 138, 0.95)',
                color: '#78350f',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                fontWeight: 500,
                fontSize: '13px'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#d97706' }}>warning</span>
                <span>Primero dibuja el recorrido en el mapa usando la herramienta de Trazado de Línea (Polyline) en los controles del mapa.</span>
              </div>
            ) : (
              <div className={styles.mapFloatingTooltip} style={{
                border: '1px solid #10b981',
                backgroundColor: 'rgba(209, 250, 229, 0.95)',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                fontWeight: 500,
                fontSize: '13px'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#059669' }}>check_circle</span>
                <span>¡Recorrido definido! Ahora puedes colocar paraderos usando los botones de Marcador, Rectángulo o Polígono.</span>
              </div>
            )}
            <GpsMap 
              mode="admin"
              stops={mapStopsFormatted}
              routesCoordinates={routePath}
              onStopsChanged={handleStopsChangedFromMap}
              onRouteChanged={setRoutePath}
            />
          </div>
        </div>

        {/* Barra de Acciones Inferior */}
        <div className={styles.bottomBar}>
          <div className={styles.lastSavedText}>
            <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '18px' }}>cloud_done</span>
            Último guardado: {lastSaved}
          </div>

          <div className={styles.bottomActions}>
            <button onClick={() => router.push('/admin/routes')} className={styles.btnCancel}>
              Cancelar
            </button>
            <button 
              onClick={handleSaveStops} 
              disabled={isSaving || !routeName.trim()} 
              className={styles.btnSubmit}
            >
              {isSaving ? (
                <>
                  <div className={styles.spinnerSmall}></div>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded">save</span>
                  Guardar Ruta
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Overlay para agregar por coordenadas */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Agregar Paradero Manual</h3>
              <button onClick={() => setIsAddModalOpen(false)} className={styles.closeBtn}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleAddStopManual}>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>NOMBRE DEL PARADERO</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={modalStopName}
                  onChange={(e) => setModalStopName(e.target.value)}
                  placeholder="Ej. Paradero Av. Unión"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>LATITUD</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={modalLat}
                    onChange={(e) => setModalLat(e.target.value)}
                    placeholder="Ej. -8.38450"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>LONGITUD</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={modalLng}
                    onChange={(e) => setModalLng(e.target.value)}
                    placeholder="Ej. -74.55320"
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>MINUTOS DESDE SALIDA</label>
                <input
                  type="number"
                  className={styles.textInput}
                  value={modalMinutes}
                  onChange={(e) => setModalMinutes(parseInt(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={styles.btnCancel}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  Agregar Parada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
