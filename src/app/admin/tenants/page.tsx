'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getAllTenantsUseCase, Tenant } from '@/app/features/tenant';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { useToast } from '@/app/shared/providers/ToastProvider';
import styles from './Tenants.module.css';

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreateNew = () => {
    router.push('/admin/tenants/create');
  };

  const loadTenants = async () => {
    setIsLoading(true);
    const result = await getAllTenantsUseCase.execute();
    
    result.match(
      (data) => {
        setTenants(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "¿Eliminar Empresa?",
      message: `¿Estás seguro de que deseas eliminar a "${name}"? Esta acción borrará todos sus datos de forma permanente.`,
      confirmText: "Sí, eliminar definitivamente",
      cancelText: "No, mantener empresa",
      type: "danger"
    });

    if (isConfirmed) {
      try {
        const { TenantApiService } = require('@/app/features/tenant/services/tenant-api.service');
        const api = new TenantApiService();
        const result = await api.delete(id);
        
        if (result.success) {
          showSuccess('Empresa eliminada', `La empresa ${name} ha sido borrada del sistema.`);
          loadTenants();
        } else {
          showError('Error al eliminar', result.errorMessage || 'No se pudo completar la operación.');
        }
      } catch (error) {
        showError('Error inesperado', 'Ocurrió un problema al intentar eliminar la empresa.');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Gestión de Empresas (Tenants)</h2>
            <p>Administra el acceso, subdominios y estado operativo de tus clientes corporativos.</p>
          </div>
          <button className={styles.addBtn} onClick={handleCreateNew}>
            <span className="material-symbols-rounded">add</span>
            + Nuevo Tenant
          </button>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <span className="material-symbols-rounded">corporate_fare</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>TOTAL TENANTS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{tenants.length}</span>
                <span className={styles.statsTrend}>+4 este mes</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>ACTIVOS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{tenants.filter(t => t.status === 'active').length}</span>
                <span className={styles.statsTrend}>96.8%</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
              <span className="material-symbols-rounded">warning</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>INACTIVOS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{tenants.filter(t => t.status === 'inactive').length}</span>
                <span className={styles.statsTrend}>Mantenimiento</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#4b5563', backgroundColor: '#f3f4f6' }}>
              <span className="material-symbols-rounded">trending_up</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>CRECIMIENTO</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>12%</span>
                <span className={styles.statsTrend}>Q3 vs Q2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className={styles.card}>
          <div className={styles.tableHeader}>
            <div className={styles.tableFilters}>
              <button className={styles.filterBtn}>
                <span className="material-symbols-rounded">filter_list</span>
                Filtrar
              </button>
              <span className={styles.tableResults}>Mostrando 1-{tenants.length} de {tenants.length} tenants</span>
            </div>
            <div className={styles.tableNav}>
              <button className={styles.navArrow}><span className="material-symbols-rounded">chevron_left</span></button>
              <button className={styles.navArrow}><span className="material-symbols-rounded">chevron_right</span></button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>SUBDOMINIO</th>
                  <th>ESTADO</th>
                  <th>FECHA DE REGISTRO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div className={styles.tenantCell}>
                        <div className={styles.tenantAvatar}>
                          {getInitials(tenant.name)}
                        </div>
                        <div className={styles.tenantMeta}>
                          <span className={styles.tenantName}>{tenant.name}</span>
                          <span className={styles.tenantId}>ID: {tenant.id.slice(0, 10).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.subdomainBadge}>
                        {tenant.slug}.centralafbv.com
                      </span>
                    </td>
                    <td>
                      <div className={`${styles.statusPill} ${styles[tenant.status]}`}>
                        <div className={styles.statusDot} />
                        {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td>
                      <span className={styles.dateCell}>
                        {new Date(tenant.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <button 
                          className={styles.actionBtn} 
                          onClick={() => router.push(`/admin/tenants/${tenant.id}/edit`)}
                          title="Editar Empresa"
                        >
                          <span className="material-symbols-rounded">edit</span>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                          onClick={() => handleDelete(tenant.id, tenant.name)}
                          title="Eliminar Empresa"
                        >
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <span className={styles.pageInfo}>Página 1 de 1</span>
            <div className={styles.pageButtons}>
              <button className={styles.pageBtn} disabled>Anterior</button>
              <button className={`${styles.pageBtn} ${styles.primaryPageBtn}`}>Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
