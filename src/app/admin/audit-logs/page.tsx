/* d:\Personal\Repositorios\GpsCentral\src\app\admin\audit-logs\page.tsx */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { AuditLogApiService, AuditLogItemDto } from '@/app/features/admin/services/audit-log-api.service';
import { 
  Calendar, 
  Layers, 
  Activity, 
  Eye, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Filter, 
  Server,
  User,
  Info
} from 'lucide-react';
import styles from '../AdminList.module.css';
import auditStyles from './AuditLogs.module.css';

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

const ACTIONS_LIST = [
  'TODAS',
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'RESTORE',
  'PAY_TICKET',
  'ANNUL_TICKET'
];

export default function AuditLogsPage() {
  const { error: showError } = useToast();
  const [role, setRole] = useState<string>('');
  const [sessionTenantId, setSessionTenantId] = useState<string>('');
  
  // Catálogos
  const [tenants, setTenants] = useState<any[]>([]);
  
  // Filtros
  const [filterTenant, setFilterTenant] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('TODAS');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Datos de la Grilla
  const [logs, setLogs] = useState<AuditLogItemDto[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Detalle Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItemDto | null>(null);

  // Instancia única del API Service
  const auditApiService = React.useMemo(() => new AuditLogApiService(), []);

  // 1. Cargar la sesión del usuario al montar
  useEffect(() => {
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session: SessionData = JSON.parse(sessionStr);
        if (session.user) {
          setRole(session.user.role);
          setSessionTenantId(session.user.tenantId || '');

          if (session.user.role === 'ADMIN') {
            setFilterTenant(session.user.tenantId || '');
          }
        }
      } catch (e) {
        console.error('Error al parsear cookie de sesión', e);
      }
    }
  }, []);

  // 2. Cargar catálogo de tenants si es SUPER_ADMIN
  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      const loadTenants = async () => {
        const result = await getAllTenantsUseCase.execute();
        result.match(
          (data) => setTenants(data),
          () => showError('Error', 'No se pudo cargar la lista de cooperativas')
        );
      };
      loadTenants();
    }
  }, [role, showError]);

  // 3. Cargar Bitácora de Logs (Paginada y con Filtros)
  const loadAuditLogs = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);

    try {
      const response = await auditApiService.getAuditLogs({
        tenantId: role === 'SUPER_ADMIN' ? filterTenant : sessionTenantId,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        action: filterAction,
        entityName: filterEntity || undefined,
        page,
        limit
      });

      if (response.success && response.data) {
        setLogs(response.data);
        if (response.meta?.pagination) {
          setTotalItems(response.meta.pagination.totalItems);
          setTotalPages(response.meta.pagination.totalPages);
        } else {
          setTotalItems(response.data.length);
          setTotalPages(1);
        }
      } else {
        showError('Error', response.errorMessage || 'No se pudieron cargar los logs de auditoría');
      }
    } catch (error) {
      showError('Error de Red', 'No se pudo establecer comunicación con el servidor');
    } finally {
      setIsLoading(false);
    }
  }, [role, filterTenant, sessionTenantId, filterStartDate, filterEndDate, filterAction, filterEntity, page, limit, auditApiService, showError]);

  // Recargar logs al cambiar filtros o página
  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Limpiar Filtros
  const handleClearFilters = () => {
    setFilterAction('TODAS');
    setFilterEntity('');
    setFilterStartDate('');
    setFilterEndDate('');
    if (role === 'SUPER_ADMIN') {
      setFilterTenant('');
    }
    setPage(1);
  };

  // Cambiar Página
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Formatear Fecha
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Obtener Badge CSS Class
  const getBadgeClass = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return auditStyles.badgeCreate;
      case 'UPDATE': return auditStyles.badgeUpdate;
      case 'DELETE': return auditStyles.badgeDelete;
      default: return auditStyles.badgeDefault;
    }
  };

  // Formatear JSON de forma segura y premium
  const formatJson = (val: any, placeholder: string) => {
    if (val === null || val === undefined) return placeholder;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return val;
      }
    }
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };

  // Determinar si los datos de rol permiten el acceso
  if (role && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.emptyState} style={{ padding: '5rem 2rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '1rem' }}>cancel</span>
            <h2 className={styles.emptyTitle}>Acceso No Autorizado</h2>
            <p className={styles.emptyDesc}>Esta sección está restringida únicamente para los administradores del sistema.</p>
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
            <h2>Bitácora de Auditoría</h2>
            <p>Monitoreo y auditoría de todas las operaciones realizadas en la plataforma en tiempo real.</p>
          </div>
          <button className={styles.addBtn} onClick={loadAuditLogs} disabled={isLoading}>
            <span className={`material-symbols-rounded ${isLoading ? auditStyles.loadingSpinner : ''}`}>refresh</span>
            Refrescar
          </button>
        </div>

        {/* Panel de Filtros Modernos */}
        <div className={styles.card} style={{ padding: '24px', marginBottom: '8px' }}>
          <div className={auditStyles.filtersGrid}>
            
            {/* Filtro por Tenant (Cooperativa) - Solo SUPER_ADMIN */}
            {role === 'SUPER_ADMIN' && (
              <div className={auditStyles.filterGroup}>
                <label className={auditStyles.filterLabel}>Cooperativa</label>
                <select 
                  className={auditStyles.filterInput} 
                  value={filterTenant} 
                  onChange={(e) => { setFilterTenant(e.target.value); setPage(1); }}
                >
                  <option value="">TODAS LAS COOPERATIVAS</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Acción */}
            <div className={auditStyles.filterGroup}>
              <label className={auditStyles.filterLabel}>Operación</label>
              <select 
                className={auditStyles.filterInput} 
                value={filterAction} 
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              >
                {ACTIONS_LIST.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Entidad */}
            <div className={auditStyles.filterGroup}>
              <label className={auditStyles.filterLabel}>Entidad Afectada</label>
              <input 
                type="text" 
                className={auditStyles.filterInput} 
                placeholder="Ej. VehicleEntity" 
                value={filterEntity}
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filtro por Fecha de Inicio */}
            <div className={auditStyles.filterGroup}>
              <label className={auditStyles.filterLabel}>Fecha Inicio</label>
              <input 
                type="date" 
                className={auditStyles.filterInput} 
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filtro por Fecha de Fin */}
            <div className={auditStyles.filterGroup}>
              <label className={auditStyles.filterLabel}>Fecha Fin</label>
              <input 
                type="date" 
                className={auditStyles.filterInput} 
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
              />
            </div>

            {/* Limpiar Filtros */}
            <div className={auditStyles.filterGroup}>
              <button className={auditStyles.clearButton} onClick={handleClearFilters}>
                <Filter size={16} />
                Limpiar Filtros
              </button>
            </div>

          </div>
        </div>

        {/* Grilla / Listado de Datos */}
        {isLoading ? (
          <div className={styles.card} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Consultando bitácora de auditoría...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.card} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={styles.emptyState}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '1rem' }}>info</span>
              <h3 className={styles.emptyTitle}>Sin registros en la bitácora</h3>
              <p className={styles.emptyDesc}>No se encontraron registros de auditoría que coincidan con los filtros seleccionados.</p>
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            {/* Escritorio: Grilla de Tabla (oculta en mobile por CSS) */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Operación</th>
                    <th>Entidad Afectada</th>
                    <th>ID Entidad</th>
                    <th>Usuario (ID)</th>
                    <th>Dirección IP</th>
                    <th>Fecha / Hora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                      <td>
                        <span className={`${auditStyles.badge} ${getBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className={styles.tenantName} style={{ fontSize: '14px' }}>{log.entityName}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#475569', fontSize: '13px' }}>{log.entityId || 'N/A'}</span>
                      </td>
                      <td>
                        <div className={styles.tenantMeta}>
                          <span className={styles.tenantName} style={{ fontSize: '13px' }}>{log.userId ? 'Usuario' : 'Sistema'}</span>
                          <span className={styles.tenantId}>{log.userId || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>{log.ipAddress || '127.0.0.1'}</span>
                      </td>
                      <td>
                        <span className={styles.dateCell} style={{ fontSize: '13px' }}>{formatDateTime(log.createdAt)}</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                            title="Ver detalle comparativo"
                          >
                            <span className="material-symbols-rounded">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: Grid de Tarjetas (ocultas en escritorio por CSS) */}
            <div className={styles.mobileList}>
              {logs.map((log) => (
                <div key={log.id} className={styles.mobileCard} onClick={() => setSelectedLog(log)}>
                  <div className={styles.cardMainInfo}>
                    <div className={styles.cardLeft}>
                      <div className={styles.avatarBox} style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>history</span>
                      </div>
                      <div className={styles.cardMeta}>
                        <h4 className={styles.mobileDriverName} style={{ fontSize: '14px', fontWeight: 700 }}>{log.entityName}</h4>
                        <span className={styles.mobileDriverInfo} style={{ fontSize: '11px' }}>
                          Reg ID: {log.entityId || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={`${auditStyles.badge} ${getBadgeClass(log.action)}`} style={{ fontSize: '10px', padding: '4px 10px' }}>
                        {log.action}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardBottomRow}>
                    <div className={styles.cardTags}>
                      <span className={styles.mobileTag}>
                        IP: {log.ipAddress || '127.0.0.1'}
                      </span>
                      <span className={styles.mobileTag}>
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <div className={styles.mobileActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        title="Ver detalle comparativo"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>visibility</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer paginación */}
            <div className={styles.footer} style={{ borderTop: '1px solid #f1f5f9' }}>
              <span className={styles.resultsCount}>
                Mostrando logs <strong>{(page - 1) * limit + 1}</strong> al <strong>{Math.min(page * limit, totalItems)}</strong> de <strong>{totalItems}</strong> registros
              </span>
              <div className={styles.pagination}>
                <button 
                  className={styles.pageBtn} 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={page === 1}
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  if (pageNum <= 0 || pageNum > totalPages) return null;

                  return (
                    <button 
                      key={pageNum} 
                      className={`${styles.pageBtn} ${page === pageNum ? styles.pageActive : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button 
                  className={styles.pageBtn} 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={page === totalPages}
                >
                  <span className="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Comparativo JSON Premium */}
        {selectedLog && (
          <div className={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <Activity size={20} color="#6366f1" />
                  Detalle de Operación: {selectedLog.action}
                </h2>
                <button className={styles.closeButton} onClick={() => setSelectedLog(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                
                {/* Tabla de Metadatos */}
                <div className={auditStyles.metaGrid}>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>ID del Log</span>
                    <span className={auditStyles.metaValue}>{selectedLog.id}</span>
                  </div>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>Entidad Afectada</span>
                    <span className={auditStyles.metaValue}>{selectedLog.entityName}</span>
                  </div>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>ID del Registro</span>
                    <span className={auditStyles.metaValue}>{selectedLog.entityId || 'N/A'}</span>
                  </div>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>Ejecutado Por</span>
                    <span className={auditStyles.metaValue}>
                      <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {selectedLog.userId ? `Usuario (${selectedLog.userId})` : 'Sistema / Webhook'}
                    </span>
                  </div>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>Origen (IP)</span>
                    <span className={auditStyles.metaValue}>{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <div className={auditStyles.metaItem}>
                    <span className={auditStyles.metaLabel}>Fecha y Hora</span>
                    <span className={auditStyles.metaValue}>{formatDateTime(selectedLog.createdAt)}</span>
                  </div>
                </div>

                <div className={auditStyles.metaItem} style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={auditStyles.metaLabel}>Navegador / User Agent</span>
                  <span className={auditStyles.metaValue} style={{ fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedLog.userAgent || 'No especificado'}
                  </span>
                </div>

                {/* Comparador de JSON en Paralelo */}
                <div className={auditStyles.diffContainer}>
                  
                  {/* Columna Izquierda: Old Values */}
                  <div className={auditStyles.diffColumn}>
                    <div className={auditStyles.diffHeader}>
                      <span className={`${auditStyles.diffTitle} ${auditStyles.diffTitleOld}`}>
                        Valores Anteriores (Antes)
                      </span>
                    </div>
                    {selectedLog.action.toUpperCase() === 'CREATE' ? (
                      <div className={`${auditStyles.diffBox} ${auditStyles.diffBoxEmpty}`}>
                        Registro Nuevo (Sin valores previos)
                      </div>
                    ) : (
                      <pre className={`${auditStyles.diffBox} ${auditStyles.diffBoxOld}`}>
                        {formatJson(selectedLog.oldValues, 'Sin datos previos registrados')}
                      </pre>
                    )}
                  </div>

                  {/* Columna Derecha: New Values */}
                  <div className={auditStyles.diffColumn}>
                    <div className={auditStyles.diffHeader}>
                      <span className={`${auditStyles.diffTitle} ${auditStyles.diffTitleNew}`}>
                        Valores Nuevos (Después)
                      </span>
                    </div>
                    {selectedLog.action.toUpperCase() === 'DELETE' ? (
                      <div className={`${auditStyles.diffBox} ${auditStyles.diffBoxEmpty}`}>
                        Registro Eliminado (Sin valores posteriores)
                      </div>
                    ) : (
                      <pre className={`${auditStyles.diffBox} ${auditStyles.diffBoxNew}`}>
                        {formatJson(selectedLog.newValues, 'Sin datos posteriores registrados')}
                      </pre>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
