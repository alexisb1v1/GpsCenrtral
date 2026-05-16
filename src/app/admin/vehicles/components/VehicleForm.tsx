/* src/app/admin/vehicles/components/VehicleForm.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Vehicle, 
  VehicleStatus, 
  CreateVehicleDto, 
  createVehicleUseCase, 
  updateVehicleUseCase,
  createVehicleDocumentUseCase,
  getVehicleDocumentsUseCase
} from '@/app/features/vehicle';
import { getAllTenantsUseCase } from '@/app/features/tenant';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import { useToast } from '@/app/shared/providers/ToastProvider';
import styles from './VehicleForm.module.css';

interface VehicleFormProps {
  vehicle?: Vehicle;
  isEdit?: boolean;
}

export default function VehicleForm({ vehicle, isEdit }: VehicleFormProps) {
  const router = useRouter();
  const { branding, slug } = useBranding();
  const { success: showSuccess, error: showError } = useToast();
  
  const isVectura = slug === 'vectura';
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    plate: vehicle?.plate || '',
    traccarDeviceId: vehicle?.traccarDeviceId || 0,
    year: vehicle?.year || new Date().getFullYear(),
    status: vehicle?.status || VehicleStatus.OPERATIVO,
    passengerCapacity: vehicle?.passengerCapacity || 0,
    ownerName: vehicle?.ownerName || '',
    ownerPhone: vehicle?.ownerPhone || '',
    tenantId: vehicle?.tenantId || (isVectura ? '' : branding?.id || ''),
  });

  // Documents State
  const [docDates, setDocDates] = useState({
    soat: '',
    revision: '',
  });

  useEffect(() => {
    if (isVectura) {
      loadTenants();
    }
    if (isEdit && vehicle?.id) {
      loadDocuments(vehicle.id);
    }
  }, [isVectura, isEdit, vehicle?.id]);

  const loadTenants = async () => {
    const result = await getAllTenantsUseCase.execute();
    result.match(
      (data) => setTenants(data),
      () => console.warn('Error cargando empresas')
    );
  };

  const loadDocuments = async (vehicleId: string) => {
    const result = await getVehicleDocumentsUseCase.execute(vehicleId);
    result.match(
      (docs) => {
        const soatDoc = docs.find(d => d.documentType === 'SOAT');
        const revDoc = docs.find(d => d.documentType === 'REVISION_TECNICA');
        setDocDates({
          soat: soatDoc?.expirationDate?.split('T')[0] || '',
          revision: revDoc?.expirationDate?.split('T')[0] || '',
        });
      },
      () => {}
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'year' || name === 'passengerCapacity' || name === 'traccarDeviceId' ? parseInt(value) || 0 : value 
    }));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDocDates(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isEdit && vehicle) {
        result = await updateVehicleUseCase.execute(vehicle.id, formData);
      } else {
        result = await createVehicleUseCase.execute(formData as CreateVehicleDto);
      }

      await result.match(
        async (savedVehicle) => {
          // Guardar Documentos
          if (docDates.soat) {
            await createVehicleDocumentUseCase.execute({
              vehicleId: savedVehicle.id,
              documentType: 'SOAT',
              documentNumber: 'AUTO_GENERATED',
              expirationDate: new Date(docDates.soat).toISOString(),
              notifyExpiration: true
            });
          }
          if (docDates.revision) {
            await createVehicleDocumentUseCase.execute({
              vehicleId: savedVehicle.id,
              documentType: 'REVISION_TECNICA',
              documentNumber: 'AUTO_GENERATED',
              expirationDate: new Date(docDates.revision).toISOString(),
              notifyExpiration: true
            });
          }

          showSuccess(
            isEdit ? 'Vehículo actualizado' : 'Vehículo registrado',
            `El vehículo con placa ${formData.plate} ha sido guardado correctamente.`
          );
          router.push('/admin/vehicles');
        },
        async (err) => {
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
      <div className={styles.header}>
        <h2>Registro de Flota</h2>
        <p>Complete los campos requeridos para el registro del vehículo en la base de datos.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Asignación */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className="material-symbols-rounded">corporate_fare</span>
            <h3>Asignación</h3>
          </div>
          <div className={styles.field}>
            <label>Empresa (Tenant)</label>
            <select 
              name="tenantId" 
              className={styles.select} 
              value={formData.tenantId}
              onChange={handleChange}
              disabled={!isVectura}
              required
            >
              <option value="">Seleccione una empresa...</option>
              {isVectura ? (
                tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              ) : (
                <option value={branding?.id}>{branding?.name}</option>
              )}
            </select>
          </div>
        </section>

        {/* Información del Vehículo */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className="material-symbols-rounded">info</span>
            <h3>Información del Vehículo</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Placa (Plate)</label>
              <input 
                type="text" 
                name="plate" 
                className={styles.input} 
                placeholder="ABC-123" 
                value={formData.plate}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Traccar Device ID</label>
              <input 
                type="number" 
                name="traccarDeviceId" 
                className={styles.input} 
                placeholder="ID del Dispositivo GPS" 
                value={formData.traccarDeviceId}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label>Estado (Status)</label>
              <select 
                name="status" 
                className={styles.select} 
                value={formData.status}
                onChange={handleChange}
              >
                <option value={VehicleStatus.OPERATIVO}>Activo</option>
                <option value={VehicleStatus.TALLER}>Mantenimiento</option>
                <option value={VehicleStatus.BAJA}>Baja</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Año de fabricación</label>
              <input 
                type="number" 
                name="year" 
                className={styles.input} 
                placeholder="Ej. 2024" 
                value={formData.year}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Capacidad de pasajeros</label>
              <input 
                type="number" 
                name="passengerCapacity" 
                className={styles.input} 
                placeholder="0" 
                value={formData.passengerCapacity}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Propietario */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className="material-symbols-rounded">person</span>
            <h3>Propietario</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Nombre del dueño</label>
              <input 
                type="text" 
                name="ownerName" 
                className={styles.input} 
                placeholder="Nombre completo" 
                value={formData.ownerName}
                onChange={handleChange}
              />
            </div>
            <div className={styles.field}>
              <label>Teléfono del dueño</label>
              <input 
                type="text" 
                name="ownerPhone" 
                className={styles.input} 
                placeholder="+51 999 999 999" 
                value={formData.ownerPhone}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Vencimiento de Documentos */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className="material-symbols-rounded">calendar_month</span>
            <h3>Vencimiento de Documentos</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Detalle de SOAT (Vencimiento)</label>
              <input 
                type="date" 
                name="soat" 
                className={styles.input} 
                value={docDates.soat}
                onChange={handleDocChange}
              />
            </div>
            <div className={styles.field}>
              <label>Detalle de Revisión Técnica (Vencimiento)</label>
              <input 
                type="date" 
                name="revision" 
                className={styles.input} 
                value={docDates.revision}
                onChange={handleDocChange}
              />
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar Vehículo' : 'Guardar Vehículo')}
          </button>
        </div>
      </form>
    </div>
  );
}
