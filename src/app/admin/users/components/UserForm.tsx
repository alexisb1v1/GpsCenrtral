/* src/app/admin/users/components/UserForm.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { createUserUseCase, updateUserUseCase, User, USER_ROLES } from '@/app/features/user';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import { getAllTenantsUseCase, Tenant } from '@/app/features/tenant';
import styles from '../UserForm.module.css';

interface UserFormProps {
  initialData?: User;
  isEdit?: boolean;
}

export default function UserForm({ initialData, isEdit = false }: UserFormProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { branding, slug } = useBranding();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OPERATOR',
    tenantId: '',
    password: '',
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Si es vectura, cargar todos los tenants para el select
    if (slug === 'vectura') {
      loadTenants();
    }

    // Si es edición, cargar datos
    if (isEdit && initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        tenantId: initialData.tenantId,
        password: '',
      });
    } else {
      // Si es creación, usar el ID del branding actual como default
      if (branding?.id) {
        setFormData(prev => ({ ...prev, tenantId: branding.id }));
      }
    }
  }, [isEdit, initialData, branding, slug]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      (err: unknown) => console.error('Error loading tenants for select', err)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const result = await updateUserUseCase.execute(initialData.id, {
          name: formData.name,
          role: formData.role,
          // Email y tenantId usualmente no se editan o se manejan con cuidado
        });

        result.match(
          () => {
            showSuccess('Usuario actualizado', `Los datos de ${formData.name} han sido guardados.`);
            router.push('/admin/users');
          },
          (err: { message: string }) => showError('Error al actualizar', err.message)
        );
      } else {
        const result = await createUserUseCase.execute(formData);

        result.match(
          () => {
            showSuccess('Usuario creado', `El usuario ${formData.name} ha sido registrado exitosamente.`);
            router.push('/admin/users');
          },
          (err: { message: string }) => showError('Error al crear', err.message)
        );
      }
    } catch (error) {
      showError('Error inesperado', 'Ocurrió un problema al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Panel de Control</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/admin/users">Usuarios</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: '#1e293b', fontWeight: 600 }}>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
      </nav>

      <div className={styles.header}>
        <h2>{isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
        <p>Complete la información para registrar un nuevo operador o administrador en el sistema Vectura.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre Completo</label>
            <div className={styles.inputWrapper}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}>person</span>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Ej. Carlos Mendoza"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Correo Electrónico</label>
            <div className={styles.inputWrapper}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}>mail</span>
              <input 
                type="email" 
                className={styles.input} 
                placeholder="carlos.mendoza@vectura.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={isEdit}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Rol del Usuario</label>
            <div className={styles.inputWrapper}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}>shield_person</span>
              <select 
                className={`${styles.input} ${styles.select}`}
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              >
                {Object.entries(USER_ROLES)
                  .filter(([key]) => {
                    if (key === 'SUPERADMIN') return slug === 'vectura';
                    return true;
                  })
                  .map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
              </select>
              <span className="material-symbols-rounded" style={{ position: 'absolute', right: '1rem', color: '#94a3b8', pointerEvents: 'none' }}>expand_more</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Empresa (Tenant)</label>
            <div className={styles.inputWrapper}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}>corporate_fare</span>
              {slug === 'vectura' && !isEdit ? (
                <>
                  <select 
                    className={`${styles.input} ${styles.select}`}
                    value={formData.tenantId}
                    onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                    required
                  >
                    <option value="">Seleccione una empresa</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                  <span className="material-symbols-rounded" style={{ position: 'absolute', right: '1rem', color: '#94a3b8', pointerEvents: 'none' }}>expand_more</span>
                </>
              ) : (
                <input 
                  type="text" 
                  className={styles.input} 
                  value={isEdit ? (initialData?.tenantId || formData.tenantId) : (branding?.name || formData.tenantId)}
                  required
                  disabled
                />
              )}
            </div>
          </div>

          {!isEdit && (
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Contraseña Temporal</label>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-rounded" style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}>lock</span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={styles.input} 
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!isEdit}
                />
                <button 
                  type="button" 
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-rounded">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <p className={styles.note}>
            Se le pedirá al usuario cambiar su contraseña en el primer inicio de sesión.
          </p>
        </div>

        <div className={styles.footer}>
          <button 
            type="button" 
            className={styles.cancelBtn}
            onClick={() => router.back()}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className={styles.saveBtn}
            disabled={isSubmitting}
          >
            <span className="material-symbols-rounded">save</span>
            {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}
