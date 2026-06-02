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
import styles from './AuditLogs.module.css';

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
      case 'CREATE': return styles.badgeCreate;
      case 'UPDATE': return styles.badgeUpdate;
      case 'DELETE': return styles.badgeDelete;
      default: return styles.badgeDefault;
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
          <div className={styles.emptyArea}>
            <AlertCircle size={48} color="#ef4444" />
            <h2>Acceso No Autorizado</h2>
            <p>Esta sección está restringida únicamente para los administradores del sistema.</p>
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
          <div className={styles.titleArea}>
            <h1 className={styles.title}>
              <Server size={28} color="#6366f1" />
              Bitácora de Auditoría
            </h1>
            <p className={styles.subtitle}>
              Monitoreo y auditoría de todas las operaciones realizadas en la plataforma en tiempo real.
            </p>
          </div>
          <div>
            <button className={styles.clearButton} onClick={loadAuditLogs} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? styles.loadingSpinner : ''} />
              Refrescar
            </button>
          </div>
        </div>

        {/* Panel de Filtros Modernos */}
        <div className={styles.filtersPanel}>
          <div className={styles.filtersGrid}>
            
            {/* Filtro por Tenant (Cooperativa) - Solo SUPER_ADMIN */}
            {role === 'SUPER_ADMIN' && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Cooperativa</label>
                <select 
                  className={styles.filterInput} 
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
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Operación</label>
              <select 
                className={styles.filterInput} 
                value={filterAction} 
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              >
                {ACTIONS_LIST.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Entidad */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Entidad Afectada</label>
              <input 
                type="text" 
                className={styles.filterInput} 
                placeholder="Ej. VehicleEntity" 
                value={filterEntity}
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filtro por Fecha de Inicio */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Fecha Inicio</label>
              <input 
                type="date" 
                className={styles.filterInput} 
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filtro por Fecha de Fin */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Fecha Fin</label>
              <input 
                type="date" 
                className={styles.filterInput} 
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
              />
            </div>

            {/* Limpiar Filtros */}
            <div className={styles.filterGroup}>
              <button className={styles.clearButton} onClick={handleClearFilters}>
                <Filter size={16} />
                Limpiar Filtros
              </button>
            </div>

          </div>
        </div>

        {/* Grilla / Tabla de Datos */}
        <div className={styles.tableContainer}>
          {isLoading ? (
            <div className={styles.loadingArea}>
              <div className={styles.loadingSpinner}></div>
              <p>Consultando bitácora de auditoría...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyArea}>
              <Info size={40} color="#94a3b8" />
              <h3>Sin registros en la bitácora</h3>
              <p>No se encontraron registros de auditoría que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableHelper}>
                Desliza horizontalmente para ver más columnas →
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Operación</th>
                    <th>Entidad Afectada</th>
                    <th>ID Entidad</th>
                    <th>Usuario (ID)</th>
                    <th>Dirección IP</th>
                    <th>Fecha / Hora</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className={styles.rowLink} onClick={() => setSelectedLog(log)}>
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{log.entityName}</span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{log.entityId || 'N/A'}</span>
                      </td>
                      <td>
                        <div className={styles.userInfo}>
                          <span className={styles.primaryText}>{log.userId ? 'Usuario' : 'Sistema'}</span>
                          <span className={styles.secondaryText}>{log.userId || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{log.ipAddress || '127.0.0.1'}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{formatDateTime(log.createdAt)}</span>
                      </td>
                      <td>
                        <button className={styles.clearButton} style={{ height: '32px', padding: '0 0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
                          <Eye size={14} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginación */}
              <div className={styles.pagination}>
                <div className={styles.pageInfo}>
                  Mostrando logs de auditoría <strong>{(page - 1) * limit + 1}</strong> al <strong>{Math.min(page * limit, totalItems)}</strong> de un total de <strong>{totalItems}</strong> registros
                </div>
                <div className={styles.paginationButtons}>
                  <button 
                    className={styles.pageButton} 
                    onClick={() => handlePageChange(page - 1)} 
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
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
                        className={`${styles.pageButton} ${page === pageNum ? styles.pageButtonActive : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button 
                    className={styles.pageButton} 
                    onClick={() => handlePageChange(page + 1)} 
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

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
                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>ID del Log</span>
                    <span className={styles.metaValue}>{selectedLog.id}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Entidad Afectada</span>
                    <span className={styles.metaValue}>{selectedLog.entityName}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>ID del Registro</span>
                    <span className={styles.metaValue}>{selectedLog.entityId || 'N/A'}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Ejecutado Por</span>
                    <span className={styles.metaValue}>
                      <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {selectedLog.userId ? `Usuario (${selectedLog.userId})` : 'Sistema / Webhook'}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Origen (IP)</span>
                    <span className={styles.metaValue}>{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Fecha y Hora</span>
                    <span className={styles.metaValue}>{formatDateTime(selectedLog.createdAt)}</span>
                  </div>
                </div>

                <div className={styles.metaItem} style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.metaLabel}>Navegador / User Agent</span>
                  <span className={styles.metaValue} style={{ fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedLog.userAgent || 'No especificado'}
                  </span>
                </div>

                {/* Comparador de JSON en Paralelo */}
                <div className={styles.diffContainer}>
                  
                  {/* Columna Izquierda: Old Values */}
                  <div className={styles.diffColumn}>
                    <div className={styles.diffHeader}>
                      <span className={`${styles.diffTitle} ${styles.diffTitleOld}`}>
                        Valores Anteriores (Antes)
                      </span>
                    </div>
                    {selectedLog.action.toUpperCase() === 'CREATE' ? (
                      <div className={`${styles.diffBox} ${styles.diffBoxEmpty}`}>
                        Registro Nuevo (Sin valores previos)
                      </div>
                    ) : (
                      <pre className={`${styles.diffBox} ${styles.diffBoxOld}`}>
                        {formatJson(selectedLog.oldValues, 'Sin datos previos registrados')}
                      </pre>
                    )}
                  </div>

                  {/* Columna Derecha: New Values */}
                  <div className={styles.diffColumn}>
                    <div className={styles.diffHeader}>
                      <span className={`${styles.diffTitle} ${styles.diffTitleNew}`}>
                        Valores Nuevos (Después)
                      </span>
                    </div>
                    {selectedLog.action.toUpperCase() === 'DELETE' ? (
                      <div className={`${styles.diffBox} ${styles.diffBoxEmpty}`}>
                        Registro Eliminado (Sin valores posteriores)
                      </div>
                    ) : (
                      <pre className={`${styles.diffBox} ${styles.diffBoxNew}`}>
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
