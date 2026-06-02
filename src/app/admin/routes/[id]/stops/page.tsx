'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getRouteDetailUseCase, updateRouteStopsUseCase, Route } from '@/app/features/route';
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
  traccarGeofenceId?: number;
  type?: 'START' | 'CHECKPOINT' | 'END';
  name: string;
  lat: number;
  lng: number;
  stopOrder: number;
  minutesFromStart: number;
  polygonCoordinates?: { lat: number; lng: number }[];
}

export default function RouteStopsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { success: showSuccess, error: showError } = useToast();

  const [route, setRoute] = useState<Route | null>(null);
  const [direction, setDirection] = useState<'IDA' | 'VUELTA'>('IDA');
  const [outboundStops, setOutboundStops] = useState<ExtendedRouteStop[]>([]);
  const [inboundStops, setInboundStops] = useState<ExtendedRouteStop[]>([]);
  const [outboundPath, setOutboundPath] = useState<{ lat: number; lng: number }[]>([]);
  const [inboundPath, setInboundPath] = useState<{ lat: number; lng: number }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Sin guardar');

  // Estados derivados dinámicos basados en la pestaña activa
  const currentStops = direction === 'IDA' ? outboundStops : inboundStops;
  const setCurrentStops = direction === 'IDA' ? setOutboundStops : setInboundStops;
  const routePath = direction === 'IDA' ? outboundPath : inboundPath;
  const setRoutePath = direction === 'IDA' ? setOutboundPath : setInboundPath;

  // Estados editables del formulario
  const [routeName, setRouteName] = useState('');
  const [routeStatus, setRouteStatus] = useState<boolean>(true);

  // Modal para agregar por coordenadas
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalStopName, setModalStopName] = useState('');
  const [modalLat, setModalLat] = useState('');
  const [modalLng, setModalLng] = useState('');
  const [modalMinutes, setModalMinutes] = useState(10);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(true);
    }
  }, [id]);

  const loadData = async (showLoadingOverlay = false) => {
    if (showLoadingOverlay) {
      setIsLoading(true);
    }
    // 1. Cargar detalle de la ruta y sus paraderos actuales
    const routeResult = await getRouteDetailUseCase.execute(id);

    routeResult.match(
      (routeData) => {
        setRoute(routeData);
        setRouteName(routeData.name);
        setRouteStatus(routeData.isActive);

        // Cargar trayectos por separado
        setOutboundPath(routeData.outboundCoordinates || []);
        setInboundPath(routeData.inboundCoordinates || []);

        const allStops = routeData.stops || [];

        // 1. Cargar y ordenar paradas de IDA
        const rawOutbound = allStops.filter(s => s.direction === 'IDA');
        const sortedOutbound = [...rawOutbound].sort((a, b) => a.stopOrder - b.stopOrder);
        const mappedOutbound: ExtendedRouteStop[] = sortedOutbound.map(s => ({
          ...s,
          lat: s.lat ?? 0,
          lng: s.lng ?? 0,
          name: s.name || `Paradero ${s.stopOrder}`,
          polygonCoordinates: s.polygonCoordinates
        }));
        setOutboundStops(mappedOutbound);

        // 2. Cargar y ordenar paradas de VUELTA
        const rawInbound = allStops.filter(s => s.direction === 'VUELTA');
        const sortedInbound = [...rawInbound].sort((a, b) => a.stopOrder - b.stopOrder);
        const mappedInbound: ExtendedRouteStop[] = sortedInbound.map(s => ({
          ...s,
          lat: s.lat ?? 0,
          lng: s.lng ?? 0,
          name: s.name || `Paradero ${s.stopOrder}`,
          polygonCoordinates: s.polygonCoordinates
        }));
        setInboundStops(mappedInbound);

        setLastSaved('Datos recién cargados');
      },
      (err) => {
        showError('Error al cargar la ruta', err.message);
        router.push('/admin/routes');
      }
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
      name: name
    };
    setCurrentStops(list);
  };

  // Al dibujar, arrastrar o eliminar en el mapa Leaflet
  const handleStopsChangedFromMap = (mapStops: any[]) => {
    const updatedStops = mapStops.map((ms, idx) => {
      const existing = currentStops[idx];
      return {
        id: existing?.id,
        traccarGeofenceId: ms.traccarGeofenceId || existing?.traccarGeofenceId,
        type: (idx === 0 ? 'START' : idx === mapStops.length - 1 ? 'END' : 'CHECKPOINT') as 'START' | 'CHECKPOINT' | 'END',
        name: ms.name || existing?.name || `Paradero ${idx + 1}`,
        lat: ms.lat,
        lng: ms.lng,
        stopOrder: idx + 1,
        minutesFromStart: ms.minutesFromStart ?? existing?.minutesFromStart ?? (idx > 0 ? (currentStops[idx - 1]?.minutesFromStart + 10) : 0),
        polygonCoordinates: ms.polygonCoordinates || existing?.polygonCoordinates, // Mantener geometría del polígono/rectángulo
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
      type: currentStops.length === 0 ? 'START' : 'CHECKPOINT'
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

    try {
      // 1. Guardar el trayecto y paraderos de IDA
      const outboundPayload = outboundStops.map(s => ({
        traccarGeofenceId: s.traccarGeofenceId || undefined,
        name: s.name || `Paradero ${s.stopOrder}`,
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
        stopOrder: s.stopOrder,
        minutesFromStart: s.minutesFromStart,
        polygonCoordinates: s.polygonCoordinates
      }));

      const outboundResult = await updateRouteStopsUseCase.execute(
        id,
        outboundPayload,
        'IDA',
        routeName,
        routeStatus,
        outboundPath
      );

      if (outboundResult.isErr()) {
        showError('Error al guardar el trayecto de IDA', outboundResult.error.message);
        setIsSaving(false);
        return;
      }

      // 2. Guardar el trayecto y paraderos de VUELTA
      const inboundPayload = inboundStops.map(s => ({
        traccarGeofenceId: s.traccarGeofenceId || undefined,
        name: s.name || `Paradero ${s.stopOrder}`,
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
        stopOrder: s.stopOrder,
        minutesFromStart: s.minutesFromStart,
        polygonCoordinates: s.polygonCoordinates
      }));

      const inboundResult = await updateRouteStopsUseCase.execute(
        id,
        inboundPayload,
        'VUELTA',
        routeName,
        routeStatus,
        inboundPath
      );

      if (inboundResult.isErr()) {
        showError('Error al guardar el trayecto de VUELTA', inboundResult.error.message);
        setIsSaving(false);
        return;
      }

      // 3. Notificación de éxito global
      showSuccess('Guardado exitoso', 'La ruta, trayectos y paraderos de IDA y VUELTA se han guardado correctamente.');
      const now = new Date();
      setLastSaved(`Hoy a las ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      loadData(false); // Recargar datos
    } catch (err: any) {
      showError('Error inesperado', err.message || 'Ocurrió un error al procesar el guardado.');
    } finally {
      setIsSaving(false);
    }
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
    traccarGeofenceId: s.traccarGeofenceId,
    name: s.name,
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <button onClick={() => router.push('/admin/routes')} className={styles.backBtn} style={{ marginBottom: 0 }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
                Volver a Rutas
              </button>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
                className={styles.backBtn}
                style={{
                  marginBottom: 0,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#f1f5f9',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>help</span>
                Ayuda / Manual
              </button>
            </div>
              <h2 className={styles.titleText}>
                <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '24px' }}>edit_road</span>
                Editar Ruta
              </h2>
              <p className={styles.titleDescription}>Configura el trayecto y la secuencia de paraderos.</p>
            </div>

            {/* Mobile Warning Premium */}
            <div className={styles.mobileWarning}>
              <span className="material-symbols-rounded">desktop_windows</span>
              <div className={styles.mobileWarningText}>
                <strong>¿Trazando rutas o paraderos?</strong> Para una mejor experiencia de edición y trazado preciso en el mapa, te sugerimos ingresar desde una computadora.
              </div>
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

            {/* Pestañas de Dirección: Ida / Vuelta */}
            <div className={styles.directionTabsContainer}>
              <button
                type="button"
                className={`${styles.directionTab} ${direction === 'IDA' ? styles.directionTabActive : ''}`}
                onClick={() => setDirection('IDA')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>arrow_forward</span>
                Ruta de Ida
              </button>
              <button
                type="button"
                className={`${styles.directionTab} ${direction === 'VUELTA' ? styles.directionTabActive : ''}`}
                onClick={() => setDirection('VUELTA')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>arrow_back</span>
                Ruta de Vuelta
              </button>
            </div>

            {/* Secuencia de Paraderos */}
            <div className={styles.sectionHeader}>
              Paraderos
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
                          value={stop.name || ''}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          placeholder="Nombre del paradero"
                        />
                        <div className={styles.stopMetaText}>
                          Lat: {Number(stop.lat ?? 0).toFixed(5)} • Lng: {Number(stop.lng ?? 0).toFixed(5)}
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
                <span>¡Recorrido definido! Ahora puedes definir las geocercas de los paraderos usando el botón de Polígono en el mapa.</span>
              </div>
            )}
            <GpsMap
              mode="admin"
              stops={mapStopsFormatted}
              routesCoordinates={routePath}
              alternativeRouteCoordinates={direction === 'IDA' ? inboundPath : outboundPath}
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

        {/* Modal Overlay para Manual de Ayuda */}
        {isHelpModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
              <div className={styles.modalHeader}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span className="material-symbols-rounded" style={{ color: '#2563eb' }}>menu_book</span>
                  Manual de Uso: Creación de Rutas y Paraderos
                </h3>
                <button onClick={() => setIsHelpModalOpen(false)} className={styles.closeBtn}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                maxHeight: '65vh',
                overflowY: 'auto',
                paddingRight: '0.5rem',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: '#334155'
              }}>
                <section style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>
                    <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '20px' }}>gesture</span>
                    1. Trazado del Recorrido (Línea de Ruta)
                  </h4>
                  <p style={{ margin: 0 }}>
                    Usa la herramienta de <strong>Trazado de Línea (Polyline)</strong> en los controles del mapa. Haz clic consecutivamente para dibujar el camino por donde circulará el autobús.
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    💡 <strong>¿Cómo finalizar la línea?</strong> Haz doble clic en el último punto que dibujaste o haz clic sobre el último punto creado para concluir el trazado.
                  </p>
                </section>

                <section style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>
                    <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '20px' }}>category</span>
                    2. Dibujo de Paraderos / Puntos de Control
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>
                      <strong>Paraderos Geocercados (Polígonos):</strong> Usa la herramienta de <strong>Polígono</strong> o <strong>Rectángulo</strong> en el mapa para trazar el área exacta de parada sobre la calzada (escala 1:1). 
                      <br />
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        💡 <strong>¿Cómo finalizar el polígono?</strong> Haz clic en el primer punto de inicio del polígono para cerrarlo y completar el área.
                      </span>
                    </li>
                    <li>
                      <strong>Paraderos Circulares (Marcadores):</strong> Si colocas un pin simple usando el <strong>Marcador</strong> en el mapa, el sistema generará automáticamente una geocerca circular a la redonda de <strong>5 metros de radio</strong> (10m de diámetro total).
                    </li>
                  </ul>
                </section>

                <section style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>
                    <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '20px' }}>edit_note</span>
                    3. Asignación de Nombres y Tiempos
                  </h4>
                  <p style={{ margin: 0 }}>
                    Al trazar un paradero, este aparecerá listado al instante en el panel izquierdo. Puedes editar libremente:
                  </p>
                  <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                    <li><strong>Nombre del paradero:</strong> Escribe un título descriptivo en la caja de texto (ej. <em>Paradero Av. Unión</em>).</li>
                    <li><strong>Minutos desde salida:</strong> Configura los minutos acumulados estimados que el bus deba tardar desde el inicio del recorrido.</li>
                  </ul>
                </section>

                <section style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>
                    <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '20px' }}>cloud_upload</span>
                    4. Guardado Unificado
                  </h4>
                  <p style={{ margin: 0 }}>
                    No es necesario guardar cada sentido por separado. Al presionar el botón <strong>Guardar Ruta</strong> en la barra inferior, el sistema procesará y guardará de forma integrada y simultánea tanto la <strong>Ruta de Ida</strong> como la <strong>Ruta de Vuelta</strong>, evitando pérdidas accidentales.
                  </p>
                </section>
              </div>

              <div style={{ display: 'flex', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsHelpModalOpen(false)} className={styles.btnSubmit} style={{ boxShadow: 'none' }}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }
