/* src/app/admin/vehicles/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getVehiclesUseCase, deleteVehicleUseCase, Vehicle, VehicleStatus } from '@/app/features/vehicle';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import styles from './Vehicles.module.css';

export default function VehiclesPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();
  const { branding, slug } = useBranding();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isVectura = slug === 'vectura';

  useEffect(() => {
    if (isVectura) {
      loadTenants();
      loadVehicles(''); // Carga global para vectura
    } else if (branding?.id) {
      loadVehicles(branding.id);
    }
  }, [branding?.id, slug]);

  const loadTenants = async () => {
    const { getAllTenantsUseCase } = require('@/app/features/tenant');
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data: any) => setTenants(data),
      () => console.warn('Error cargando tenants para el filtro')
    );
  };

  const loadVehicles = async (tenantId: string = '') => {
    setIsLoading(true);
    // Nota: El backend ya maneja tenantId opcional en GET /v1/vehicles
    const result = await getVehiclesUseCase.execute(tenantId);
    result.match(
      (data) => {
        setVehicles(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  const handleDelete = async (id: string, plate: string) => {
    const isConfirmed = await confirm({
      title: "¿Eliminar Vehículo?",
      message: `¿Estás seguro de que deseas eliminar el vehículo con placa "${plate}"? Esta acción no se puede deshacer.`,
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });

    if (isConfirmed) {
      const result = await deleteVehicleUseCase.execute(id);
      result.match(
        () => {
          showSuccess('Vehículo eliminado', `El vehículo ${plate} ha sido eliminado.`);
          loadVehicles();
        },
        (err) => showError('Error al eliminar', err.message)
      );
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    inRoute: vehicles.filter(v => v.status === VehicleStatus.OPERATIVO).length,
    maintenance: vehicles.filter(v => v.status === VehicleStatus.TALLER).length
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Inventario de Buses</h2>
            <p>Monitorea y gestiona los activos operativos de tu flota urbana.</p>
          </div>
          <button className={styles.addBtn} onClick={() => router.push('/admin/vehicles/create')}>
            <span className="material-symbols-rounded">add</span>
            Nuevo Vehículo
          </button>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#eff6ff' }}>
              <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '32px' }}>directions_bus</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Total Vehículos</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.total}</span>
                <span className={styles.statsTrend}>+4% <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>trending_up</span></span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#f0fdf4' }}>
              <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '32px' }}>route</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>En Ruta</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.inRoute}</span>
                <span className={styles.statsTrend} style={{ color: '#64748b' }}>
                  {stats.total > 0 ? ((stats.inRoute / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ background: '#fef2f2' }}>
              <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '32px' }}>settings_suggest</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>En Mantenimiento</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{stats.maintenance}</span>
                <span className={`${styles.statsTrend} ${styles.trendDown}`}>
                  +2 <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>warning</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className={styles.card}>
          <div className={styles.tableHeader}>
            <div className={styles.searchWrapper}>
              <span className="material-symbols-rounded">search</span>
              <input 
                type="text" 
                className={styles.searchInput} 
                placeholder="Buscar vehículo..." 
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
                      loadVehicles(id);
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
              <p>Cargando inventario...</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Traccar ID</th>
                    <th>Año</th>
                    <th>Capacidad</th>
                    <th>Empresa (Tenant)</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <div className={styles.plateCell}>
                          <div className={styles.plateBadge}>{vehicle.plate}</div>
                          <div className={styles.plateInfo}>
                            <span className={styles.plateText}>{vehicle.plate}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.traccarCell}>
                          <span className={styles.traccarValue}>{vehicle.traccarDeviceId || '---'}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.yearCell}>
                          <span className={styles.yearValue}>{vehicle.year}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.capacityCell}>
                          <span className={styles.capacityValue}>{vehicle.passengerCapacity || '---'}</span>
                          <span className={styles.capacityLabel}>Pasajeros</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.tenantCell}>
                          <div className={styles.tenantIndicator}></div>
                          <span className={styles.tenantText}>{vehicle.tenantName || 'Sin empresa'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          vehicle.status === VehicleStatus.OPERATIVO ? styles.statusActive : 
                          vehicle.status === VehicleStatus.TALLER ? styles.statusMaintenance : 
                          styles.statusBaja
                        }`}>
                          {vehicle.status === VehicleStatus.OPERATIVO ? 'Activo' : 
                           vehicle.status === VehicleStatus.TALLER ? 'Mantenimiento' : 
                           'De Baja'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => router.push(`/admin/vehicles/${vehicle.id}/edit`)}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(vehicle.id, vehicle.plate)}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                        No se encontraron vehículos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.resultsCount}>Mostrando 1 a {filteredVehicles.length} de {stats.total} vehículos</span>
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled><span className="material-symbols-rounded">chevron_left</span></button>
              <button className={`${styles.pageBtn} ${styles.pageActive}`}>1</button>
              <button className={styles.pageBtn} disabled><span className="material-symbols-rounded">chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
