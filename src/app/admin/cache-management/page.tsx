/* d:\Personal\Repositorios\GpsCentral\src\app\admin\cache-management\page.tsx */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { CacheApiService, CacheItemDto } from '@/app/features/admin/services/cache-api.service';
import { 
  Database, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  CheckCircle,
  X,
  Eye,
  Server
} from 'lucide-react';
import styles from '../AdminList.module.css';
import cacheStyles from './CacheManagement.module.css';

interface SessionData {
  token: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

export default function CacheManagementPage() {
  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();
  
  const [role, setRole] = useState<string>('');
  
  // Catálogos
  const [tenants, setTenants] = useState<any[]>([]);
  
  // Datos de Caché y Filtrado
  const [cacheItems, setCacheItems] = useState<CacheItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  
  // Estados de Operación
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [unlinkDevices, setUnlinkDevices] = useState<boolean>(false);
  
  // Diagnóstico JSON individual
  const [selectedItem, setSelectedItem] = useState<CacheItemDto | null>(null);

  // Instancia del API Service
  const cacheApiService = useMemo(() => new CacheApiService(), []);

  // 1. Cargar sesión de usuario
  useEffect(() => {
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session: SessionData = JSON.parse(sessionStr);
        if (session.user) {
          setRole(session.user.role);
        }
      } catch (e) {
        console.error('Error al parsear cookie de sesión', e);
      }
    }
  }, []);

  // 2. Cargar catálogo de cooperativas
  const loadTenants = useCallback(async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => showError('Error', 'No se pudo cargar la lista de cooperativas')
    );
  }, [showError]);

  // 3. Cargar estado de la caché desde el Backend
  const loadCacheStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await cacheApiService.getCacheStatus();
      if (response.success && response.data) {
        setCacheItems(response.data);
      } else {
        showError('Error', response.errorMessage || 'No se pudo precargar el estado de la caché.');
      }
    } catch (err) {
      showError('Error de red', 'No se pudo establecer comunicación con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [cacheApiService, showError]);

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      loadTenants();
      loadCacheStatus();
    }
  }, [role, loadTenants, loadCacheStatus]);

  // 4. Filtrado en vivo de los registros de la caché en el frontend
  const filteredItems = useMemo(() => {
    return cacheItems.filter(item => {
      const matchesSearch = 
        item.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.driverName && item.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.traccarDeviceId.toString().includes(searchQuery);
      
      const matchesTenant = !selectedTenant || item.tenantId === selectedTenant;
      
      return matchesSearch && matchesTenant;
    });
  }, [cacheItems, searchQuery, selectedTenant]);

  // 5. Métricas derivadas en caliente
  const stats = useMemo(() => {
    const total = cacheItems.length;
    const active = cacheItems.filter(item => item.hasActiveTicket).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [cacheItems]);

  // 6. Acción de Restablecimiento en Caliente
  const handleResetCache = async () => {
    const isConfirmed = await confirm({
      title: unlinkDevices ? '⚠️ ¿Restablecer y desvincular de Traccar?' : '🔄 ¿Restablecer caché en caliente?',
      message: unlinkDevices
        ? 'ATENCIÓN: Esta opción desafiliará en lote a todos los camiones de Traccar. Se detendrá el monitoreo activo en ruta en este momento. ¿Deseas continuar?'
        : 'Esta acción reconstruirá la caché en memoria sincronizándola con los datos más frescos de la base de datos. Los camiones en ruta seguirán siendo monitoreados sin ninguna interrupción. ¿Deseas proceder?',
      confirmText: unlinkDevices ? 'Sí, desafiliar y resetear' : 'Sí, restablecer en caliente',
      cancelText: 'Cancelar',
      type: unlinkDevices ? 'danger' : 'info'
    });

    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const response = await cacheApiService.resetCache(unlinkDevices);
      if (response.success) {
        showSuccess(
          'Operación Exitosa',
          unlinkDevices 
            ? 'Caché restablecida y dispositivos desafiliados en Traccar.'
            : 'Caché restablecida en caliente de forma segura.'
        );
        // Recargar datos frescos
        loadCacheStatus();
      } else {
        showError('Fallo en la operación', response.errorMessage || 'No se pudo restablecer la caché.');
      }
    } catch (err) {
      showError('Error de red', 'Ocurrió un error al enviar el comando al servidor.');
    } finally {
      setIsResetting(false);
    }
  };

  // Restringir visualmente a SUPER_ADMIN
  if (role && role !== 'SUPER_ADMIN') {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.emptyState} style={{ padding: '5rem 2rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '1rem' }}>cancel</span>
            <h2 className={styles.emptyTitle}>Acceso No Autorizado</h2>
            <p className={styles.emptyDesc}>Esta consola de diagnóstico de caché está estrictamente restringida para súper administradores del sistema.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        
        {/* Cabecera Premium */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Consola de Caché y Memoria</h2>
            <p>Diagnóstico en vivo y restablecimiento selectivo en caliente de la caché de vehículos y tickets diarios.</p>
          </div>
          <button className={styles.addBtn} onClick={loadCacheStatus} disabled={isLoading || isResetting}>
            <span className={`material-symbols-rounded ${(isLoading && !isResetting) ? 'loading-spinner' : ''}`} style={{ fontSize: '18px' }}>
              refresh
            </span>
            Actualizar Visor
          </button>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {/* Card 1: Total en Memoria */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#eff6ff' }}>
              <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '32px' }}>database</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Total en Memoria</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.total}</span>
                <span className={styles.statsTrend} style={{ fontSize: '12px' }}>Vehículos</span>
              </div>
            </div>
          </div>

          {/* Card 2: Con Ticket (Activos en Ruta) */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#f0fdf4' }}>
              <span className="material-symbols-rounded" style={{ color: '#16a34a', fontSize: '32px' }}>local_shipping</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Asignados Hoy</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue} style={{ color: '#16a34a' }}>{stats.active}</span>
                <span className={styles.statsTrend} style={{ fontSize: '12px' }}>Con Ticket</span>
              </div>
            </div>
          </div>

          {/* Card 3: Sin Salida Asignada */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#f8fafc' }}>
              <span className="material-symbols-rounded" style={{ color: '#64748b', fontSize: '32px' }}>history_toggle_off</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Sin Asignación</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue} style={{ color: '#64748b' }}>{stats.inactive}</span>
                <span className={styles.statsTrend} style={{ fontSize: '12px' }}>Unidades</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Control de Comando y Rehidratación */}
        <div className={cacheStyles.controlCard}>
          <div className={cacheStyles.controlRow}>
            {/* Control Checkbox Estilo Switch iOS */}
            <div className={cacheStyles.switchContainer} onClick={() => setUnlinkDevices(!unlinkDevices)}>
              <div className={cacheStyles.switchToggle}>
                <input 
                  type="checkbox" 
                  checked={unlinkDevices} 
                  onChange={() => {}} // Manejado por el click del contenedor
                />
                <span className={cacheStyles.slider}></span>
              </div>
              <div className={cacheStyles.switchLabelArea}>
                <span className={cacheStyles.switchTitle}>Desvincular vehículos de sus rutas en Traccar</span>
                <span className={cacheStyles.switchDesc}>
                  Recomendado únicamente al final del día o durante mantenimientos programados de noche.
                </span>
              </div>
            </div>

            {/* Botón de Disparo de Acción */}
            <button 
              className={styles.addBtn} 
              style={{ 
                backgroundColor: unlinkDevices ? '#dc2626' : '#2563eb', 
                boxShadow: unlinkDevices ? '0 4px 12px rgba(220, 38, 38, 0.15)' : '0 4px 12px rgba(37, 99, 235, 0.15)',
                minWidth: '220px',
                height: '48px',
                justifyContent: 'center'
              }}
              onClick={handleResetCache}
              disabled={isResetting || isLoading}
            >
              <RefreshCw size={18} className={isResetting ? styles.spinner : ''} style={{ marginRight: '8px' }} />
              {isResetting ? 'Restableciendo...' : 'Restablecer Memoria'}
            </button>
          </div>

          {/* Banner de Advertencia Dinámico */}
          <div className={`${cacheStyles.warningBanner} ${unlinkDevices ? cacheStyles.warningBannerDanger : cacheStyles.warningBannerInfo}`}>
            <div className={cacheStyles.warningIcon}>
              {unlinkDevices ? <AlertTriangle size={20} /> : <Info size={20} />}
            </div>
            <div className={cacheStyles.warningText}>
              <span className={cacheStyles.warningTitle}>
                {unlinkDevices ? '⚠️ MODO DE DESAFILIACIÓN TOTAL ACTIVO' : '💡 MODO SEGURO DIURNO ACTIVO'}
              </span>
              <span>
                {unlinkDevices 
                  ? 'Atención: Restablecer la caché en este modo desafiliará instantáneamente a todos los camiones de sus grupos de ruta en la API de Traccar. Los vehículos activos perderán su monitoreo en tránsito hasta que se les asigne un nuevo ticket de salida.'
                  : 'Recomendado para limpiezas durante el día de trabajo. La memoria del servidor se sincronizará con la base de datos fresca sin desafiliar a ningún vehículo ni interrumpir el monitoreo activo de las unidades en ruta.'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Listado / Tabla de Diagnóstico */}
        <div className={styles.card}>
          {/* Cabecera del Listado con Filtros */}
          <div className={styles.tableHeader}>
            <div className={styles.tableFilters}>
              {/* Buscador en Vivo */}
              <div className={styles.searchWrapper}>
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar por placa, conductor o ID Traccar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selector de Cooperativa */}
              <div className={styles.tenantFilterWrapper}>
                <span className="material-symbols-rounded">filter_alt</span>
                <select
                  className={styles.tenantSelect}
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                >
                  <option value="">Todas las empresas</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.tableResults}>
                Mostrando <strong>{filteredItems.length}</strong> de <strong>{cacheItems.length}</strong> camiones en memoria
              </div>
            </div>
          </div>

          {isLoading && !isResetting ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Consultando estado de la caché en caliente...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '4rem 2rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '1rem' }}>info</span>
              <h3 className={styles.emptyTitle}>Sin coincidencias</h3>
              <p className={styles.emptyDesc}>No se encontraron vehículos registrados en la caché que coincidan con la búsqueda o empresa seleccionada.</p>
            </div>
          ) : (
            <>
              {/* Tabla Escritorio */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID Traccar</th>
                      <th>Placa</th>
                      <th>Cooperativa (Tenant)</th>
                      <th>Conductor Asignado</th>
                      <th>Ruta Asignada</th>
                      <th>Sentido</th>
                      <th>Ticket Hoy</th>
                      <th>Ver JSON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.traccarDeviceId} style={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                            {item.traccarDeviceId}
                          </span>
                        </td>
                        <td>
                          <span className={styles.tenantName} style={{ fontSize: '14px' }}>
                            {item.plate}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                            {item.tenantName || 'No especificado'}
                          </span>
                        </td>
                        <td>
                          {item.driverName && item.driverName !== 'No asignado' ? (
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{item.driverName}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Sin asignar</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            {item.routeName || 'Sin Ruta'}
                          </span>
                        </td>
                        <td>
                          {item.direction ? (
                            <span className={`${styles.statusBadge} ${styles.statusActive}`} style={{ fontSize: '11px', padding: '3px 10px', background: '#eff6ff', color: '#2563eb' }}>
                              {item.direction}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>---</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${item.hasActiveTicket ? styles.statusActive : styles.statusInactive}`} style={{ fontSize: '11px', padding: '4px 12px' }}>
                            {item.hasActiveTicket ? 'Activo' : 'Sin Ticket'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                              title="Ver estado en caché crudo"
                            >
                              <span className="material-symbols-rounded">code</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lista Tarjetas Móvil */}
              <div className={styles.mobileList}>
                {filteredItems.map((item) => (
                  <div key={item.traccarDeviceId} className={styles.mobileCard} onClick={() => setSelectedItem(item)}>
                    <div className={styles.cardMainInfo}>
                      <div className={styles.cardLeft}>
                        <div className={styles.avatarBox} style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>local_shipping</span>
                        </div>
                        <div className={styles.cardMeta}>
                          <h4 className={styles.mobileDriverName} style={{ fontSize: '14px', fontWeight: 700 }}>
                            {item.plate}
                          </h4>
                          <span className={styles.mobileDriverInfo} style={{ fontSize: '11px' }}>
                            ID Traccar: {item.traccarDeviceId}
                          </span>
                        </div>
                      </div>
                      <div className={styles.cardRight}>
                        <span className={`${styles.statusBadge} ${item.hasActiveTicket ? styles.statusActive : styles.statusInactive}`} style={{ fontSize: '10px', padding: '4px 10px' }}>
                          {item.hasActiveTicket ? 'Activo' : 'Sin Ticket'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#334155', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#64748b' }}>Cooperativa:</span>
                        <span>{item.tenantName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#64748b' }}>Conductor:</span>
                        <span style={{ fontWeight: 600 }}>{item.driverName || 'No asignado'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#64748b' }}>Ruta:</span>
                        <span>{item.routeName || 'Sin Ruta'}</span>
                      </div>
                    </div>

                    <div className={styles.cardBottomRow}>
                      <div className={styles.cardTags}>
                        {item.direction && (
                          <span className={styles.mobileTag} style={{ background: '#eff6ff', color: '#2563eb' }}>
                            Sentido: {item.direction}
                          </span>
                        )}
                        <span className={styles.mobileTag}>
                          GPS: {item.lastPosition ? 'Conectado' : 'Sin Datos'}
                        </span>
                      </div>
                      <div className={styles.mobileActions}>
                        <button
                          className={styles.actionBtn}
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                          title="Ver estado crudo"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>code</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Diagnóstico JSON en Caliente */}
        {selectedItem && (
          <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)} style={{ zIndex: 9999 }}>
            <div className={`${styles.modalContent} ${cacheStyles.jsonModal}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <Server size={18} color="#2563eb" />
                  Estado en Memoria: {selectedItem.plate}
                </h2>
                <button className={styles.closeButton} onClick={() => setSelectedItem(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.modalBody} style={{ gap: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  A continuación se presenta el objeto JSON de estado en caliente guardado en el servidor para el identificador Traccar <strong>{selectedItem.traccarDeviceId}</strong>:
                </p>
                <pre className={cacheStyles.jsonBox}>
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
