/* src/app/penalties/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getInfractionsUseCase, Infraction, InfractionType, InfractionStatus } from '@/app/features/infraction';
import { getDriversUseCase, Driver } from '@/app/features/driver';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useToast } from '@/app/shared/providers/ToastProvider';
import styles from '../admin/AdminList.module.css';

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

export default function PenaltiesPage() {
  const { error: showError } = useToast();

  const [role, setRole] = useState<string>('');
  const [sessionTenantId, setSessionTenantId] = useState<string>('');
  const [sessionUserId, setSessionUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper para obtener fecha local en formato YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtros interactivos
  const [filterTenant, setFilterTenant] = useState<string>('');
  const [filterDriver, setFilterDriver] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>(getTodayString());

  useEffect(() => {
    // 1. Obtener la sesión actual desde la cookie
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session: SessionData = JSON.parse(sessionStr);
        if (session.user) {
          setRole(session.user.role);
          setSessionTenantId(session.user.tenantId || '');
          setSessionUserId(session.user.id);
          setUserName(session.user.name);

          // Ajustes de inicialización de filtros de acuerdo al rol
          if (session.user.role === 'ADMIN' || session.user.role === 'OPERATOR') {
            setFilterTenant(session.user.tenantId || '');
          } else if (session.user.role === 'DRIVER') {
            setFilterTenant(session.user.tenantId || '');
            setFilterDriver(session.user.id);
          }
        }
      } catch (e) {
        console.error('Error al parsear la cookie de sesión:', e);
      }
    }
  }, []);

  // 2. Cargar catálogos (tenants y drivers) solo cuando se haya determinado el rol
  useEffect(() => {
    if (!role) return;

    if (role === 'SUPER_ADMIN') {
      loadTenants();
      loadDriversGlobal();
    } else if (role === 'ADMIN' || role === 'OPERATOR') {
      loadDriversByTenant(sessionTenantId);
    }
  }, [role, sessionTenantId]);

  // 3. Cargar las sanciones cuando cambie el rol, los filtros o la sesión
  useEffect(() => {
    if (!role) return;
    loadInfractions();
  }, [role, sessionTenantId, sessionUserId, filterTenant, filterDriver, filterDate]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => {}
    );
  };

  const loadDriversGlobal = async () => {
    const result = await getDriversUseCase.execute('');
    result.match(
      (data) => setDrivers(data),
      () => {}
    );
  };

  const loadDriversByTenant = async (tenantId: string) => {
    if (!tenantId) return;
    const result = await getDriversUseCase.execute(tenantId);
    result.match(
      (data) => setDrivers(data),
      () => {}
    );
  };

  const loadInfractions = async () => {
    setIsLoading(true);
    
    // Determinar los parámetros de llamada basados en la seguridad del rol
    let qTenant: string | undefined = undefined;
    let qDriver: string | undefined = undefined;

    if (role === 'SUPER_ADMIN') {
      qTenant = filterTenant || undefined;
      qDriver = filterDriver || undefined;
    } else if (role === 'ADMIN' || role === 'OPERATOR') {
      qTenant = sessionTenantId;
      qDriver = filterDriver || undefined;
    } else if (role === 'DRIVER') {
      qTenant = sessionTenantId;
      qDriver = sessionUserId;
    }

    const result = await getInfractionsUseCase.execute({
      tenantId: qTenant,
      driverId: qDriver,
      date: filterDate || undefined,
    });

    result.match(
      async (data) => {
        // Enriquecer las infracciones con el nombre del chofer de la lista local
        const enriched = data.map(inf => {
          const matchDriver = drivers.find(d => d.id === inf.userId);
          return {
            ...inf,
            driverName: matchDriver ? matchDriver.name : 'Chofer Desconocido',
          };
        });
        setInfractions(enriched);
        setIsLoading(false);
      },
      (err) => {
        showError('Error al cargar sanciones', err.message);
        setIsLoading(false);
      }
    );
  };

  // Helper para formatear montos en Soles
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  // Helper para formatear fechas
  const formatDate = (dateStr: Date | string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Traducir tipos de infracción
  const getInfractionTypeLabel = (type: InfractionType) => {
    switch (type) {
      case InfractionType.PIRATERIA:
        return 'Piratería / Desvío';
      case InfractionType.EVASION_PAGO:
        return 'Evasión de Pago';
      case InfractionType.RETRASO_RUTA:
        return 'Retraso de Horario';
      default:
        return type;
    }
  };

  // Obtener estilos y labels de estados
  const getStatusInfo = (status: InfractionStatus) => {
    switch (status) {
      case InfractionStatus.PENDING:
        return { label: 'Pendiente', colorClass: styles.trendDown, badgeClass: styles.statusInactive, bg: '#fffbeb', text: '#d97706' };
      case InfractionStatus.PAID:
        return { label: 'Pagado', colorClass: styles.statusActive, badgeClass: styles.statusActive, bg: '#f0fdf4', text: '#16a34a' };
      case InfractionStatus.ANNULLED:
        return { label: 'Anulado', colorClass: styles.statusInactive, badgeClass: styles.statusInactive, bg: '#f1f5f9', text: '#64748b' };
      default:
        return { label: status, colorClass: '', badgeClass: '', bg: '#f1f5f9', text: '#475569' };
    }
  };

  // Cálculos dinámicos de métricas
  const stats = {
    totalPending: infractions.filter(i => i.status === InfractionStatus.PENDING).length,
    totalPaid: infractions.filter(i => i.status === InfractionStatus.PAID).length,
    amountPending: infractions
      .filter(i => i.status === InfractionStatus.PENDING)
      .reduce((sum, item) => sum + Number(item.amount), 0),
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Encabezado */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Control de Sanciones</h2>
            <p>
              {role === 'DRIVER'
                ? `Bienvenido ${userName}. Visualiza tus sanciones asignadas y su estado de pago.`
                : 'Gestión y seguimiento de infracciones operativas de choferes y unidades.'}
            </p>
          </div>
        </div>

        {/* Tarjetas de Métricas (Premium UI / Deslizable en móvil) */}
        <div className={styles.statsGrid}>
          {/* Tarjeta 1: Pendientes */}
          <div className={styles.statsCard}>
            <div className={`${styles.statsIcon} ${styles.trendDown}`} style={{ backgroundColor: '#fef2f2' }}>
              <span className="material-symbols-rounded">gavel</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Sanciones Pendientes</span>
              <h3 className={styles.statsValue}>{stats.totalPending}</h3>
              <span className={styles.statsTrend} style={{ color: '#ef4444' }}>
                Requieren regularización
              </span>
            </div>
          </div>

          {/* Tarjeta 2: Monto Pendiente */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <span className="material-symbols-rounded">payments</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Monto Acumulado Pendiente</span>
              <h3 className={styles.statsValue}>{formatCurrency(stats.amountPending)}</h3>
              <span className={styles.statsTrend} style={{ color: '#d97706' }}>
                Total por regularizar
              </span>
            </div>
          </div>

          {/* Tarjeta 3: Pagadas */}
          <div className={styles.statsCard}>
            <div className={`${styles.statsIcon} ${styles.statusActive}`} style={{ backgroundColor: '#f0fdf4' }}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Sanciones Pagadas</span>
              <h3 className={styles.statsValue}>{stats.totalPaid}</h3>
              <span className={styles.statsTrend} style={{ color: '#16a34a' }}>
                Infracciones solucionadas
              </span>
            </div>
          </div>
        </div>

        {/* Bloque de Tabla y Filtros */}
        <div className={styles.card}>
          {/* Barra de Filtros */}
          <div className={styles.tableHeader}>
            <div className={styles.tableFilters}>
              
              {/* Filtro Empresa (Solo SuperAdmin) */}
              {role === 'SUPER_ADMIN' && (
                <div className={styles.tenantFilterWrapper}>
                  <select
                    className={styles.tenantSelect}
                    value={filterTenant}
                    onChange={(e) => {
                      setFilterTenant(e.target.value);
                      setFilterDriver(''); // Reset chofer al cambiar tenant
                      loadDriversByTenant(e.target.value);
                    }}
                  >
                    <option value="">Todas las empresas</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro Chofer (SuperAdmin, Admin, Operator) */}
              {role !== 'DRIVER' && role !== '' && (
                <div className={styles.tenantFilterWrapper}>
                  <select
                    className={styles.tenantSelect}
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                  >
                    <option value="">Todos los choferes</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro de Fecha (Todos) */}
              <div className={styles.tenantFilterWrapper} style={{ minWidth: '180px' }}>
                <input
                  type="date"
                  className={styles.tenantSelect}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              {/* Resultados */}
              <span className={styles.tableResults}>
                Mostrando {infractions.length} sanciones
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando sanciones...</p>
            </div>
          ) : (
            <>
              {/* Vista de Escritorio (Tabla) */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Fecha</th>
                      <th className={styles.th}>Vehículo</th>
                      {role !== 'DRIVER' && <th className={styles.th}>Chofer</th>}
                      <th className={styles.th}>Tipo Sanción</th>
                      <th className={styles.th}>Monto</th>
                      <th className={styles.th}>Detalle / Descripción</th>
                      <th className={styles.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {infractions.map((item) => {
                      const statusInfo = getStatusInfo(item.status);
                      return (
                        <tr key={item.id} className={styles.tr}>
                          <td className={styles.td}>
                            <span style={{ fontWeight: 500, color: '#475569' }}>
                              {formatDate(item.createdAt)}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.plateCell}>
                              <div className={styles.plateBadge}>
                                {item.vehicle?.plate || 'S/P'}
                              </div>
                            </div>
                          </td>
                          {role !== 'DRIVER' && (
                            <td className={styles.td}>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                {item.driverName}
                              </span>
                            </td>
                          )}
                          <td className={styles.td}>
                            <span className={styles.routeBadge}>
                              {getInfractionTypeLabel(item.type)}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span style={{ fontWeight: 800, color: '#1e293b' }}>
                              {formatCurrency(Number(item.amount))}
                            </span>
                          </td>
                          <td className={styles.td} style={{ maxWidth: '280px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'normal', display: 'block' }}>
                              {item.description || 'Sin descripción adicional'}
                              {item.status === InfractionStatus.ANNULLED && item.cancellationReason && (
                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                                  Motivo de anulación: {item.cancellationReason}
                                </div>
                              )}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span
                              className={styles.statusBadge}
                              style={{ backgroundColor: statusInfo.bg, color: statusInfo.text, fontWeight: 700 }}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {infractions.length === 0 && (
                      <tr>
                        <td
                          colSpan={role === 'DRIVER' ? 6 : 7}
                          style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}
                        >
                          No se encontraron sanciones registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil Responsiva (.mobileList unificado y cerrado fuera de tableWrapper) */}
              <div className={styles.mobileList}>
                {infractions.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  return (
                    <div key={item.id} className={styles.mobileCard}>
                      <div className={styles.cardMainInfo}>
                        <div className={styles.cardLeft}>
                          <div className={styles.avatarCircle} style={{ width: '40px', height: '40px', backgroundColor: '#fcfdfe', color: '#475569', border: '1.5px solid #e2e8f0' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>gavel</span>
                          </div>
                          <div className={styles.avatarInfo}>
                            <span className={styles.mobileDriverName} style={{ fontSize: '14px', fontWeight: 700 }}>
                              Vehículo: {item.vehicle?.plate || 'Sin Placa'}
                            </span>
                            {role !== 'DRIVER' && (
                              <span className={styles.driverEmail} style={{ fontSize: '12px', color: '#475569' }}>
                                Chofer: {item.driverName}
                              </span>
                            )}
                            <span className={styles.driverEmail} style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.cardRight}>
                          <span
                            className={styles.statusBadge}
                            style={{
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.text,
                              fontSize: '10px',
                              padding: '4px 10px',
                              lineHeight: 1,
                              borderRadius: '20px',
                              fontWeight: 700
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cardBottomRow} style={{ marginTop: '8px' }}>
                        <div className={styles.cardTags}>
                          <span className={styles.mobileTag}>
                            {getInfractionTypeLabel(item.type)}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                            {formatCurrency(Number(item.amount))}
                          </span>
                        </div>
                      </div>
                      
                      {item.description && (
                        <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                          {item.description}
                          {item.status === InfractionStatus.ANNULLED && item.cancellationReason && (
                            <div style={{ color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                              Anulado por: {item.cancellationReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {infractions.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '3rem',
                      color: '#94a3b8',
                      fontSize: '13px',
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    No se encontraron sanciones registradas.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer de Paginación Estático (Estructurado de acuerdo con AdminList) */}
          <div className={styles.footer}>
            <span className={styles.resultsCount}>
              Mostrando 1-{infractions.length} de {infractions.length} sanciones
            </span>
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled>
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
              <button className={`${styles.pageBtn} ${styles.pageActive}`}>1</button>
              <button className={styles.pageBtn} disabled>
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
