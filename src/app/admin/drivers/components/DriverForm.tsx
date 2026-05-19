/* src/app/admin/drivers/components/DriverForm.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Driver, 
  DriverStatus, 
  createDriverUseCase, 
  updateDriverUseCase 
} from '@/app/features/driver';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import { useToast } from '@/app/shared/providers/ToastProvider';
import styles from './DriverForm.module.css';

interface DriverFormProps {
  driver?: Driver;
  isEdit?: boolean;
}

export default function DriverForm({ driver, isEdit }: DriverFormProps) {
  const router = useRouter();
  const { branding, slug } = useBranding();
  const { success: showSuccess, error: showError } = useToast();
  
  const isVectura = slug === 'vectura';
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    dni: driver?.driverInfo?.dni || '',
    phoneEmergency: driver?.driverInfo?.phoneEmergency || '',
    tenantId: driver?.tenantId || (isVectura ? '' : branding?.id || ''),
    status: driver?.status || DriverStatus.ACTIVE,
    licenseNumber: driver?.driverInfo?.licenseNumber || '',
    licenseExpiry: driver?.driverInfo?.licenseExpiry 
      ? new Date(driver.driverInfo.licenseExpiry).toISOString().split('T')[0]
      : '',
  });

  useEffect(() => {
    if (isVectura) {
      loadTenants();
    }
  }, [isVectura]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => {}
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Solo números
    if (val.length <= 8) {
      setFormData(prev => ({ ...prev, dni: val }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isEdit && driver) {
        result = await updateDriverUseCase.execute(driver.id, {
          name: formData.name,
          dni: formData.dni,
          phoneEmergency: formData.phoneEmergency || undefined,
          status: formData.status,
          licenseNumber: formData.licenseNumber,
          licenseExpiry: new Date(formData.licenseExpiry).toISOString(),
        });
      } else {
        result = await createDriverUseCase.execute({
          name: formData.name,
          dni: formData.dni,
          phoneEmergency: formData.phoneEmergency || undefined,
          tenantId: formData.tenantId,
          licenseNumber: formData.licenseNumber,
          licenseExpiry: new Date(formData.licenseExpiry).toISOString(),
        });
      }

      result.match(
        () => {
          showSuccess(
            isEdit ? 'Chofer actualizado' : 'Chofer registrado',
            `El chofer ${formData.name} ha sido guardado correctamente.`
          );
          router.push('/admin/drivers');
        },
        (err) => {
          showError('Error al guardar', err.message);
        }
      );
    } catch (error) {
      showError('Error inesperado', 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <span className={styles.breadcrumbLink} onClick={() => router.push('/admin/drivers')}>
          Gestión de Choferes
        </span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>
          {isEdit ? 'Editar Chofer' : 'Nuevo Chofer'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerTitleSection}>
            <h2>{isEdit ? 'Editar Chofer' : 'Crear Nuevo Chofer'}</h2>
            <p>
              {isEdit 
                ? 'Edite la información detallada del operador en el sistema.' 
                : 'Registre la información detallada para habilitar a un nuevo operador en el sistema.'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={() => router.push('/admin/drivers')}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar Chofer' : 'Guardar Chofer')}
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className={styles.contentLayout}>
          {/* Left Panel */}
          <div className={styles.leftPanel}>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxHeader}>
                <span className="material-symbols-rounded">info</span>
                <span>Requisitos Legales</span>
              </div>
              <p className={styles.infoBoxText}>
                Asegúrese de que el Número de Licencia coincida exactamente con el documento físico.
                El sistema validará automáticamente la fecha de vencimiento.
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {/* Card 1: Datos Personales */}
            <div className={styles.card}>
              <h3>Datos Personales</h3>
              <div className={styles.formGrid}>
                {/* Nombre Completo */}
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label htmlFor="name">Nombre Completo</label>
                  <input 
                    type="text" 
                    id="name"
                    name="name" 
                    className={styles.input} 
                    placeholder="Ej. Juan Pérez García" 
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* DNI */}
                <div className={styles.field}>
                  <label htmlFor="dni">DNI / Documento Identidad</label>
                  <input 
                    type="text" 
                    id="dni"
                    name="dni" 
                    className={styles.input} 
                    placeholder="8 dígitos" 
                    value={formData.dni}
                    onChange={handleDniChange}
                    pattern="[0-9]{8}"
                    title="El DNI debe tener exactamente 8 dígitos"
                    required
                  />
                </div>

                {/* Teléfono de Emergencia */}
                <div className={styles.field}>
                  <label htmlFor="phoneEmergency">Teléfono de Emergencia</label>
                  <div className={styles.inputWrapper}>
                    <span className={`material-symbols-rounded ${styles.inputIcon}`}>phone</span>
                    <input 
                      type="text" 
                      id="phoneEmergency"
                      name="phoneEmergency" 
                      className={`${styles.input} ${styles.inputWithIcon}`} 
                      placeholder="+51 987 654 321" 
                      value={formData.phoneEmergency}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Empresa (Tenant) */}
                <div className={styles.field}>
                  <label htmlFor="tenantId">Empresa (Tenant)</label>
                  <select 
                    id="tenantId"
                    name="tenantId" 
                    className={styles.select} 
                    value={formData.tenantId}
                    onChange={handleChange}
                    disabled={!isVectura || isEdit}
                    required
                  >
                    <option value="">Seleccionar Empresa...</option>
                    {isVectura ? (
                      tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    ) : (
                      <option value={branding?.id}>{branding?.name}</option>
                    )}
                  </select>
                </div>

                {/* Estado Inicial */}
                <div className={styles.field}>
                  <label>Estado Inicial</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input 
                        type="radio" 
                        name="status" 
                        value={DriverStatus.ACTIVE}
                        checked={formData.status === DriverStatus.ACTIVE}
                        onChange={() => setFormData(prev => ({ ...prev, status: DriverStatus.ACTIVE }))}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioLabel}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#16a34a' }}>check_circle</span>
                        Activo
                      </span>
                    </label>
                    <label className={styles.radioOption}>
                      <input 
                        type="radio" 
                        name="status" 
                        value={DriverStatus.INACTIVE}
                        checked={formData.status === DriverStatus.INACTIVE}
                        onChange={() => setFormData(prev => ({ ...prev, status: DriverStatus.INACTIVE }))}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioLabel}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#dc2626' }}>cancel</span>
                        Inactivo
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Información de Licencia */}
            <div className={styles.card}>
              <h3>Información de Licencia</h3>
              <div className={styles.formGrid}>
                {/* Número de Licencia */}
                <div className={styles.field}>
                  <label htmlFor="licenseNumber">Número de Licencia</label>
                  <input 
                    type="text" 
                    id="licenseNumber"
                    name="licenseNumber" 
                    className={styles.input} 
                    placeholder="Q-45628193" 
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Fecha de Vencimiento */}
                <div className={styles.field}>
                  <label htmlFor="licenseExpiry">Fecha de Vencimiento</label>
                  <input 
                    type="date" 
                    id="licenseExpiry"
                    name="licenseExpiry" 
                    className={styles.input} 
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
