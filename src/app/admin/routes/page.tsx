/* src/app/admin/routes/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getRoutesByTenantUseCase, createRouteUseCase, Route } from '@/app/features/route';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import styles from './Routes.module.css';

export default function RoutesPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { branding, slug } = useBranding();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Todos' | 'Activas' | 'Inactivas'>('Todos');

  // Modal de nueva ruta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVectura = slug === 'vectura';

  useEffect(() => {
    if (isVectura) {
      loadTenants();
      loadRoutes(''); // Carga global para Vectura
    } else if (branding?.id) {
      loadRoutes(branding.id);
    } else {
      // Fallback a la cookie de sesión
      const sessionStr = Cookies.get('gps_central_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          const sessionTenantId = session.user?.tenantId;
          if (sessionTenantId) {
            loadRoutes(sessionTenantId);
            return;
          }
        } catch (e) {}
      }
      setIsLoading(false);
    }
  }, [branding?.id, slug]);

  const loadTenants = async () => {
    const { getAllTenantsUseCase } = require('@/app/features/tenant');
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data: any) => setTenants(data),
      () => {}
    );
  };

  const loadRoutes = async (tenantId: string) => {
    setIsLoading(true);
    setError(null);
    const result = await getRoutesByTenantUseCase.execute(tenantId);
    result.match(
      (data) => {
        setRoutes(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  const handleTenantFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTenantFilter(val);
    loadRoutes(val);
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) {
      showError('Nombre requerido', 'Por favor ingresa un nombre para la ruta.');
      return;
    }

    setIsSubmitting(true);
    const result = await createRouteUseCase.execute(newRouteName.trim());
    result.match(
      (createdRoute) => {
        showSuccess('Ruta Creada', `La ruta "${createdRoute.name}" ha sido registrada con éxito.`);
        setNewRouteName('');
        setShowCreateModal(false);
        // Recargar lista
        if (isVectura) {
          loadRoutes(selectedTenantFilter);
        } else if (branding?.id) {
          loadRoutes(branding.id);
        }
      },
      (err) => {
        showError('Error al crear ruta', err.message);
      }
    );
    setIsSubmitting(false);
  };

  // Filtrado de rutas en base a pestañas, búsqueda y tenant
  const filteredRoutes = routes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'Activas') {
      return matchesSearch && r.isActive;
    }
    if (activeTab === 'Inactivas') {
      return matchesSearch && !r.isActive;
    }
    return matchesSearch;
  });

  const stats = {
    total: routes.length,
    active: routes.filter(r => r.isActive).length,
    inactive: routes.filter(r => !r.isActive).length
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Rutas de Transporte</h2>
            <p>Define los trayectos A - B y configura sus paraderos de control operativos.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-rounded">add</span>
            Nueva Ruta
          </button>
        </div>

        {/* Mobile Warning Premium */}
        <div className={styles.mobileWarning}>
          <span className="material-symbols-rounded">desktop_windows</span>
          <div className={styles.mobileWarningText}>
            <strong>¿Trazando rutas o paraderos?</strong> Para una mejor experiencia de edición y trazado preciso en el mapa, te sugerimos ingresar desde una computadora.
          </div>
        </div>

        {/* Stats Summary */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <span className="material-symbols-rounded">alt_route</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>RUTAS TOTALES</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.total}</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#10b981', backgroundColor: '#f0fdf4' }}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>RUTAS ACTIVAS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.active}</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}>
              <span className="material-symbols-rounded">block</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>DESACTIVADAS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.inactive}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table & Filtering */}
        <div className={styles.card}>
          <div className={styles.tableHeader}>
            <div className={styles.tabs}>
              {(['Todos', 'Activas', 'Inactivas'] as const).map(tab => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <div className={styles.searchWrapper}>
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Buscar ruta..."
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isVectura && (
                <div className={styles.tenantFilterWrapper}>
                  <span className="material-symbols-rounded">filter_alt</span>
                  <select
                    className={styles.tenantSelect}
                    value={selectedTenantFilter}
                    onChange={handleTenantFilterChange}
                  >
                    <option value="">Todos los Tenants</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.companyName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingSection}>
              <div className={styles.spinner}></div>
              <p>Cargando trayectos y rutas...</p>
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <p>{error}</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-rounded styles.emptyIcon">route</span>
              <h3 className={styles.emptyTitle}>No se encontraron rutas</h3>
              <p className={styles.emptyDesc}>Registra una nueva ruta de trayecto o cambia los criterios de búsqueda.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Nombre de Ruta</th>
                      <th className={styles.th}>Estado</th>
                      <th className={styles.th}>Fecha de Creación</th>
                      <th className={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.map((route) => (
                      <tr key={route.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.routeNameCell}>
                            <div className={styles.routeIconWrapper}>
                              <span className="material-symbols-rounded">navigation</span>
                            </div>
                            <span className={styles.routeNameText}>{route.name}</span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${route.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                            {route.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className={styles.td}>
                          {route.createdAt ? new Date(route.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actionsCell}>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                              title="Configurar paraderos y tiempos"
                              onClick={() => router.push(`/admin/routes/${route.id}/stops`)}
                            >
                              <span className="material-symbols-rounded">edit_road</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Listado móvil responsivo Vectura */}
              <div className={styles.mobileList}>
                {filteredRoutes.map((route) => (
                  <div key={route.id} className={styles.mobileCard}>
                    <div className={styles.cardLeft}>
                      <div className={styles.avatarBox}>
                        <span className="material-symbols-rounded">alt_route</span>
                      </div>
                      <div className={styles.cardMeta}>
                        <h4 className={styles.mobileName}>{route.name}</h4>
                        <div className={styles.mobileBadgeRow}>
                          <span className={`${styles.badge} ${route.isActive ? styles.badgeActive : styles.badgeInactive}`} style={{ padding: '2px 8px', fontSize: '10px' }}>
                            {route.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <span className={styles.mobileDate}>
                          Creado: {route.createdAt ? new Date(route.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <button
                        className={styles.mobileActionBtn}
                        title="Configurar paraderos"
                        onClick={() => router.push(`/admin/routes/${route.id}/stops`)}
                      >
                        <span className="material-symbols-rounded">edit_road</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal: Registrar Ruta */}
        {showCreateModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Registrar Nueva Ruta</h3>
                <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateRoute}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre de la Ruta (Ej. Ruta 103 - A)</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="Ingrese el nombre"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? 'Registrando...' : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
