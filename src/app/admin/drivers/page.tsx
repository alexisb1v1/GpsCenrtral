/* src/app/admin/drivers/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { 
  getDriversUseCase, 
  updateDriverUseCase, 
  Driver, 
  DriverStatus 
} from '@/app/features/driver';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import styles from './Drivers.module.css';

export default function DriversPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();
  const { branding, slug } = useBranding();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertBanner, setShowAlertBanner] = useState(true);

  const isVectura = slug === 'vectura';

  useEffect(() => {
    if (isVectura) {
      loadTenants();
      loadDrivers(''); // Carga global para Vectura
    } else if (branding?.id) {
      loadDrivers(branding.id);
    }
  }, [branding?.id, slug]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => {}
    );
  };

  const loadDrivers = async (tenantId: string = '') => {
    setIsLoading(true);
    setError(null);
    const result = await getDriversUseCase.execute(tenantId);
    result.match(
      (data) => {
        setDrivers(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  const handleToggleStatus = async (driver: Driver) => {
    const isActivating = driver.status === DriverStatus.INACTIVE;
    const isConfirmed = await confirm({
      title: isActivating ? "¿Activar Chofer?" : "¿Desactivar Chofer?",
      message: `¿Estás seguro de que deseas ${isActivating ? 'activar' : 'desactivar'} a "${driver.name}" en el sistema?`,
      confirmText: isActivating ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      type: isActivating ? "info" : "danger"
    });

    if (isConfirmed) {
      const newStatus = isActivating ? DriverStatus.ACTIVE : DriverStatus.INACTIVE;
      
      // Armamos los datos requeridos por el UpdateDriverDto
      const result = await updateDriverUseCase.execute(driver.id, {
        name: driver.name,
        dni: driver.driverInfo?.dni || '',
        licenseNumber: driver.driverInfo?.licenseNumber || '',
        licenseExpiry: driver.driverInfo?.licenseExpiry ? new Date(driver.driverInfo.licenseExpiry).toISOString() : new Date().toISOString(),
        phoneEmergency: driver.driverInfo?.phoneEmergency || undefined,
        status: newStatus
      });

      result.match(
        () => {
          showSuccess(
            isActivating ? 'Chofer activado' : 'Chofer desactivado', 
            `El chofer ${driver.name} ha cambiado su estado.`
          );
          loadDrivers(isVectura ? selectedTenantFilter : (branding?.id || ''));
        },
        (err) => showError('Error al actualizar estado', err.message)
      );
    }
  };

  // Helper para obtener iniciales del chofer
  const getInitials = (name: string) => {
    if (!name) return 'CH';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Helper para formatear fechas a "15 Oct 2025"
  const formatDate = (dateStr: Date | string | undefined) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Validaciones del vencimiento de licencias
  const getLicenseExpiryInfo = (expiryDateStr: Date | string | undefined) => {
    if (!expiryDateStr) return { text: '---', isWarning: false };
    const exp = new Date(expiryDateStr);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const formatted = formatDate(exp);

    if (exp <= thirtyDaysFromNow) {
      return { text: formatted, isWarning: true };
    }
    return { text: formatted, isWarning: false };
  };

  // Filtros de búsqueda
  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.driverInfo?.dni && d.driverInfo.dni.includes(searchQuery)) ||
    (d.driverInfo?.licenseNumber && d.driverInfo.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Métricas
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const stats = {
    total: drivers.length,
    expiring: drivers.filter(d => {
      if (!d.driverInfo?.licenseExpiry) return false;
      const exp = new Date(d.driverInfo.licenseExpiry);
      return exp <= thirtyDaysFromNow;
    }).length,
    active: drivers.filter(d => d.status === DriverStatus.ACTIVE).length
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Gestión de Choferes</h2>
            <p>Administra el personal operativo y controla el estado de sus licencias.</p>
          </div>
          <button className={styles.addBtn} onClick={() => router.push('/admin/drivers/create')}>
            <span className="material-symbols-rounded">add</span>
            Nuevo Chofer
          </button>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          {/* Card 1: Total */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#eff6ff' }}>
              <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '32px' }}>group</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Total Choferes</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.total}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Licencias por Vencer */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#fef2f2' }}>
              <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '32px' }}>warning</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Licencias por Vencer</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue} style={{ color: stats.expiring > 0 ? '#ef4444' : '#1e293b' }}>
                  {stats.expiring}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Activos */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#f0fdf4' }}>
              <span className="material-symbols-rounded" style={{ color: '#16a34a', fontSize: '32px' }}>verified_user</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Choferes Activos</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.active}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Listado de Personal Card */}
        <div className={styles.card}>
          <div className={styles.tableHeader}>
            <div className={styles.searchWrapper}>
              <span className="material-symbols-rounded">search</span>
              <input 
                type="text" 
                className={styles.searchInput} 
                placeholder="Buscar chofer, licencia o DNI..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.tableActions}>
              {isVectura && (
                <div className={styles.tenantFilterWrapper}>
                  <span className="material-symbols-rounded">filter_alt</span>
                  <select 
                    className={styles.tenantSelect}
                    value={selectedTenantFilter} 
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTenantFilter(id);
                      loadDrivers(id);
                    }}
                  >
                    <option value="">Todas las empresas</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button className={styles.iconBtn} title="Filtrar">
                <span className="material-symbols-rounded">filter_list</span>
              </button>
              <button className={styles.iconBtn} title="Exportar">
                <span className="material-symbols-rounded">download</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando personal operativo...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>error</span>
              <p>{error}</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>DNI</th>
                      <th>Nº Licencia</th>
                      <th>Vencimiento</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => {
                      const expiryInfo = getLicenseExpiryInfo(driver.driverInfo?.licenseExpiry);
                      return (
                        <tr key={driver.id}>
                          {/* Nombre + Avatar Bubble */}
                          <td>
                            <div className={styles.avatarCell}>
                              <div className={styles.avatarCircle}>
                                {getInitials(driver.name)}
                              </div>
                              <div className={styles.avatarInfo}>
                                <span className={styles.driverName}>{driver.name}</span>
                                <span className={styles.driverEmail}>{driver.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* DNI */}
                          <td>
                            <span style={{ fontWeight: 600, color: '#475569' }}>
                              {driver.driverInfo?.dni || '---'}
                            </span>
                          </td>

                          {/* Licencia */}
                          <td>
                            <span style={{ fontWeight: 600, color: '#475569' }}>
                              {driver.driverInfo?.licenseNumber || '---'}
                            </span>
                          </td>

                          {/* Vencimiento con Alerta de Licencia */}
                          <td>
                            {expiryInfo.isWarning ? (
                              <span className={styles.expiryWarning}>
                                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>calendar_today</span>
                                {expiryInfo.text}
                              </span>
                            ) : (
                              <span className={styles.expiryNormal}>
                                {expiryInfo.text}
                              </span>
                            )}
                          </td>

                          {/* Estado Badge */}
                          <td>
                            <span className={`${styles.statusBadge} ${
                              driver.status === DriverStatus.ACTIVE 
                                ? styles.statusActive 
                                : styles.statusInactive
                            }`}>
                              {driver.status === DriverStatus.ACTIVE ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td>
                            <div className={styles.actions}>
                              {/* Editar */}
                              <button 
                                className={styles.actionBtn} 
                                onClick={() => router.push(`/admin/drivers/${driver.id}/edit`)}
                                title="Editar chofer"
                              >
                                <span className="material-symbols-rounded">edit</span>
                              </button>
                              {/* Activar/Desactivar */}
                              <button 
                                className={`${styles.actionBtn} ${driver.status === DriverStatus.ACTIVE ? styles.deleteBtn : ''}`} 
                                onClick={() => handleToggleStatus(driver)}
                                title={driver.status === DriverStatus.ACTIVE ? "Desactivar chofer" : "Activar chofer"}
                              >
                                <span className="material-symbols-rounded">
                                  {driver.status === DriverStatus.ACTIVE ? 'block' : 'check_circle'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDrivers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                          No se encontraron choferes registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards View (Rediseño Vectura Premium) */}
                <div className={styles.mobileList}>
                  {filteredDrivers.map((driver) => {
                    const expiryInfo = getLicenseExpiryInfo(driver.driverInfo?.licenseExpiry);
                    return (
                      <div key={driver.id} className={styles.mobileCard}>
                        <div className={styles.cardMainInfo}>
                          <div className={styles.cardLeft}>
                            <div className={styles.avatarBox}>
                              {getInitials(driver.name)}
                            </div>
                            <div className={styles.cardMeta}>
                              <h4 className={styles.mobileDriverName}>{driver.name}</h4>
                              <span className={styles.mobileDriverInfo}>
                                Licencia: {driver.driverInfo?.licenseNumber || '---'}
                              </span>
                            </div>
                          </div>
                          <div className={styles.cardRight}>
                            <span className={`${styles.statusBadge} ${
                              driver.status === DriverStatus.ACTIVE 
                                ? styles.statusActive 
                                : styles.statusInactive
                            }`} style={{ fontSize: '10px', padding: '4px 10px' }}>
                              {driver.status === DriverStatus.ACTIVE ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                        <div className={styles.cardBottomRow}>
                          <div className={styles.cardTags}>
                            <span className={styles.mobileTag}>
                              DNI: {driver.driverInfo?.dni || '---'}
                            </span>
                            {expiryInfo.isWarning ? (
                              <span className={styles.mobileTag} style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>
                                Vence: {expiryInfo.text}
                              </span>
                            ) : (
                              <span className={styles.mobileTag}>
                                Vence: {expiryInfo.text}
                              </span>
                            )}
                          </div>
                          <div className={styles.mobileActions}>
                            <button 
                              className={styles.actionBtn} 
                              onClick={() => router.push(`/admin/drivers/${driver.id}/edit`)}
                              style={{ width: '32px', height: '32px' }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${driver.status === DriverStatus.ACTIVE ? styles.deleteBtn : ''}`} 
                              onClick={() => handleToggleStatus(driver)}
                              style={{ width: '32px', height: '32px' }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                                {driver.status === DriverStatus.ACTIVE ? 'block' : 'check_circle'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredDrivers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '13px' }}>
                      No se encontraron choferes registrados.
                    </div>
                  )}
                </div>
              </>
            </div>
          )}

          {/* Footer paginación */}
          <div className={styles.footer}>
            <span className={styles.resultsCount}>
              Mostrando 1-{filteredDrivers.length} de {stats.total} choferes
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

        {/* Recordatorio de Seguridad Alert Banner */}
        {showAlertBanner && (
          <div className={styles.alertBanner}>
            <span className={`material-symbols-rounded ${styles.alertIcon}`}>info</span>
            <div className={styles.alertContent}>
              <h4 className={styles.alertTitle}>Recordatorio de Seguridad</h4>
              <p className={styles.alertText}>
                Asegúrese de que todos los choferes hayan completado el curso de capacitación semestral de seguridad vial. 
                Los perfiles con licencias vencidas serán bloqueados automáticamente para la asignación de nuevas rutas.
              </p>
              <div className={styles.alertActions}>
                <span className={styles.alertLink}>Ver capacitación</span>
                <span 
                  className={`${styles.alertLink} ${styles.alertLinkSecondary}`} 
                  onClick={() => setShowAlertBanner(false)}
                >
                  Descartar
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
