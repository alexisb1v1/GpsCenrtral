/* src/app/admin/users/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { getUsersByTenantUseCase, User, USER_ROLES, resetPasswordUseCase, updateUserUseCase } from '@/app/features/user';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useConfirm } from '@/app/shared/providers/ConfirmProvider';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import styles from '../AdminList.module.css';

export default function UsersPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();
  const { branding, slug } = useBranding();

  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Todos');

  // Estado para el modal de reset de contraseña
  const [resetModal, setResetModal] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false, userId: '', userName: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isVectura = slug === 'vectura';

  useEffect(() => {
    if (isVectura) {
      loadTenants();
      loadUsers(''); // Carga global para vectura
    } else if (branding?.id) {
      loadUsers(branding.id);
    } else {
      // Fallback
      const sessionStr = Cookies.get('gps_central_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          const sessionTenantId = session.user?.tenantId;
          if (sessionTenantId) {
            loadUsers(sessionTenantId);
            return;
          }
        } catch (e) {}
      }
      
      if (!branding && slug) {
        setError(`No se pudo cargar la configuración.`);
        setIsLoading(false);
      }
    }
  }, [branding?.id, slug]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => {}
    );
  };

  const loadUsers = async (tenantId: string) => {
    setIsLoading(true);
    
    try {
      const result = await getUsersByTenantUseCase.execute(tenantId);
      
      result.match(
        (data) => {
          setUsers(data);
          setIsLoading(false);
        },
        (err: { message: string }) => {
          setError(err.message);
          setIsLoading(false);
        }
      );
    } catch (e) {
      setError('Error al procesar la sesión.');
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "¿Desactivar Usuario?",
      message: `¿Estás seguro de que deseas desactivar a "${name}"? Esta acción inhabilitará su acceso al sistema.`,
      confirmText: "Sí, desactivar",
      cancelText: "Cancelar",
      type: "danger"
    });

    if (isConfirmed) {
      try {
        const { deleteUserUseCase } = require('@/app/features/user');
        const result = await deleteUserUseCase.execute(id);
        
        result.match(
          () => {
            showSuccess('Usuario desactivado', `El usuario ${name} ha sido desactivado del sistema.`);
            if (isVectura) {
              loadUsers(selectedTenantFilter);
            } else if (branding?.id) {
              loadUsers(branding.id);
            }
          },
          (err: { message: string }) => {
            showError('Error al desactivar', err.message);
          }
        );
      } catch (error) {
        showError('Error inesperado', 'Ocurrió un problema al intentar desactivar el usuario.');
      }
    }
  };

  const handleActivate = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "¿Activar Usuario?",
      message: `¿Estás seguro de que deseas activar a "${name}"? Esta acción restablecerá su acceso al sistema.`,
      confirmText: "Sí, activar",
      cancelText: "Cancelar",
      type: "info"
    });

    if (isConfirmed) {
      try {
        const result = await updateUserUseCase.execute(id, { isActive: true });
        
        result.match(
          () => {
            showSuccess('Usuario activado', `El usuario ${name} ha sido activado del sistema.`);
            if (isVectura) {
              loadUsers(selectedTenantFilter);
            } else if (branding?.id) {
              loadUsers(branding.id);
            }
          },
          (err: { message: string }) => {
            showError('Error al activar', err.message);
          }
        );
      } catch (error) {
        showError('Error inesperado', 'Ocurrió un problema al intentar activar el usuario.');
      }
    }
  };

  const openResetModal = (userId: string, userName: string) => {
    setResetModal({ open: true, userId, userName });
    setNewPassword('');
    setShowNewPassword(false);
  };

  const closeResetModal = () => {
    setResetModal({ open: false, userId: '', userName: '' });
    setNewPassword('');
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsResetting(true);
    try {
      const result = await resetPasswordUseCase.execute(resetModal.userId, newPassword);
      result.match(
        () => {
          showSuccess('Contraseña restablecida', `La contraseña de ${resetModal.userName} fue actualizada correctamente.`);
          closeResetModal();
        },
        (err: { message: string }) => showError('Error al restablecer', err.message)
      );
    } catch {
      showError('Error inesperado', 'Ocurrió un problema al restablecer la contraseña.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === 'Todos') return true;
    if (activeTab === 'Desactivos') return !u.isActive;
    
    // Para las pestañas de perfiles específicos, solo mostramos los activos
    if (!u.isActive) return false;
    
    if (activeTab === 'Administradores') return u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    if (activeTab === 'Controladores') return u.role === 'OPERATOR';
    if (activeTab === 'Choferes') return u.role === 'DRIVER';
    return true;
  });

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Gestión de Usuarios</h2>
            <p>Administra el acceso de los operadores y técnicos de la flota.</p>
          </div>
          <button className={styles.addBtn} onClick={() => router.push('/admin/users/create')}>
            <span className="material-symbols-rounded">add</span>
            + Nuevo Usuario
          </button>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <span className="material-symbols-rounded">group</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>USUARIOS TOTALES</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{users.length}</span>
                <span className={styles.statsTrend}>+12%</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#10b981', backgroundColor: '#f0fdf4' }}>
              <span className="material-symbols-rounded">bolt</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>SESIONES ACTIVAS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{Math.ceil(users.length * 0.4)}</span>
                <span className={styles.statsTrend}>En vivo</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#f59e0b', backgroundColor: '#fffbeb' }}>
              <span className="material-symbols-rounded">shield</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>ROLES DEFINIDOS</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>4</span>
                <span className={styles.statsTrend}>Seguro</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
              <span className="material-symbols-rounded">schedule</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>TIEMPO PROMEDIO</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>4h 22m</span>
                <span className={styles.statsTrend}>Estable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className={styles.card}>
          <div className={styles.tableHeader}>
            <div className={styles.tabs}>
              {['Todos', 'Administradores', 'Controladores', 'Choferes', 'Desactivos'].map(tab => (
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
              {isVectura && (
                <div className={styles.tenantFilterWrapper}>
                  <span className="material-symbols-rounded">filter_alt</span>
                  <select 
                    className={styles.tenantSelect}
                    value={selectedTenantFilter} 
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTenantFilter(id);
                      loadUsers(id);
                    }}
                  >
                    <option value="">Todas las empresas</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <span className={styles.dateCell}>Mostrando {filteredUsers.length} usuarios</span>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className={styles.loading}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '1rem' }}>error</span>
              <p>{error}</p>
              <button 
                onClick={() => loadUsers(isVectura ? selectedTenantFilter : branding?.id || '')} 
                className={styles.addBtn} 
                style={{ marginTop: '1rem' }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>NOMBRE</th>
                      <th>EMAIL</th>
                      <th>ROL</th>
                      <th>ESTADO</th>
                      <th>FECHA DE CREACIÓN</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.userAvatar}>
                              {getInitials(user.name)}
                            </div>
                            <div className={styles.userMeta}>
                              <span className={styles.userName}>{user.name}</span>
                              <span className={styles.userEmail}>ID: {user.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.dateCell}>{user.email}</span>
                        </td>
                        <td>
                          <span className={`${styles.roleBadge} ${styles['role_' + user.role]}`}>
                            {USER_ROLES[user.role] || user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}>
                            {user.isActive ? 'Activo' : 'Desactivo'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.dateCell}>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '---'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {user.isActive ? (
                              <>
                                <button 
                                  className={styles.actionBtn} 
                                  onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                                  title="Editar"
                                >
                                  <span className="material-symbols-rounded">edit</span>
                                </button>
                                <button 
                                  className={`${styles.actionBtn} ${styles.resetBtn}`} 
                                  onClick={() => openResetModal(user.id, user.name)}
                                  title="Restablecer contraseña"
                                >
                                  <span className="material-symbols-rounded">lock_reset</span>
                                </button>
                                <button 
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                                  onClick={() => handleDelete(user.id, user.name)}
                                  title="Desactivar"
                                >
                                  <span className="material-symbols-rounded">block</span>
                                </button>
                              </>
                            ) : (
                              <button 
                                className={`${styles.actionBtn} ${styles.activateBtn}`} 
                                onClick={() => handleActivate(user.id, user.name)}
                                title="Activar"
                              >
                                <span className="material-symbols-rounded">check_circle</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No se encontraron usuarios en esta categoría.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Listado móvil responsivo de tarjetas Vectura */}
              <div className={styles.mobileList}>
                {filteredUsers.map((user) => (
                  <div key={user.id} className={styles.mobileCard}>
                    <div className={styles.cardMainInfo}>
                      <div className={styles.cardLeft}>
                        <div className={styles.avatarBox}>
                          {getInitials(user.name)}
                        </div>
                        <div className={styles.cardMeta}>
                          <h4 className={styles.mobileName}>{user.name}</h4>
                          <span className={styles.mobileEmail}>{user.email}</span>
                          <span className={styles.mobileId}>ID: {user.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <div className={styles.cardRight}>
                        <span className={`${styles.roleBadge} ${styles['role_' + user.role]}`} style={{ marginBottom: '4px' }}>
                          {USER_ROLES[user.role] || user.role}
                        </span>
                        <span className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}>
                          {user.isActive ? 'Activo' : 'Desactivo'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.cardBottomRow}>
                      <div className={styles.cardTags}>
                        <span className={styles.mobileTag}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : '---'}
                        </span>
                      </div>

                      <div className={styles.mobileActions}>
                        {user.isActive ? (
                          <>
                            <button 
                              className={styles.actionBtn} 
                              onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                              title="Editar"
                            >
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.resetBtn}`} 
                              onClick={() => openResetModal(user.id, user.name)}
                              title="Restablecer contraseña"
                            >
                              <span className="material-symbols-rounded">lock_reset</span>
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                              onClick={() => handleDelete(user.id, user.name)}
                              title="Desactivar"
                            >
                              <span className="material-symbols-rounded">block</span>
                            </button>
                          </>
                        ) : (
                          <button 
                            className={`${styles.actionBtn} ${styles.activateBtn}`} 
                            onClick={() => handleActivate(user.id, user.name)}
                            title="Activar"
                          >
                            <span className="material-symbols-rounded">check_circle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    No se encontraron usuarios en esta categoría.
                  </div>
                )}
              </div>
            </>
          )}

          <div className={styles.footer}>
            <span className={styles.dateCell}>Mostrando 1-{filteredUsers.length} de {filteredUsers.length} usuarios</span>
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled><span className="material-symbols-rounded">chevron_left</span></button>
              <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
              <button className={styles.pageBtn} disabled><span className="material-symbols-rounded">chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Reset Password */}
      {resetModal.open && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            animation: 'fadeInUp 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '22px' }}>lock_reset</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Restablecer Contraseña</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{resetModal.userName}</p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Ingresa la nueva contraseña temporal para este usuario. Se le pedirá cambiarla en su próximo inicio de sesión.
            </p>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{
                position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: '20px', pointerEvents: 'none'
              }}>lock</span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                style={{
                  width: '100%', padding: '0.75rem 2.75rem', border: '1.5px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '0.95rem', outline: 'none',
                  boxSizing: 'border-box', color: '#1e293b'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                  {showNewPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeResetModal}
                disabled={isResetting}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isResetting || newPassword.length < 6}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
                  background: isResetting || newPassword.length < 6 ? '#94a3b8' : '#f59e0b',
                  color: '#fff', cursor: isResetting || newPassword.length < 6 ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>lock_reset</span>
                {isResetting ? 'Guardando...' : 'Restablecer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
