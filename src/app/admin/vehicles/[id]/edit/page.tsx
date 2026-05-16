/* src/app/admin/vehicles/[id]/edit/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import VehicleForm from '../../components/VehicleForm';
import { getVehiclesUseCase, Vehicle } from '@/app/features/vehicle';

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVehicle();
    }
  }, [id]);

  const loadVehicle = async () => {
    const result = await getVehiclesUseCase.execute(); // Idealmente tener un findById case
    // Por ahora usamos el getById que ya está en el repositorio pero no tiene su propio usecase explícito
    // Usaremos el getById del repositorio directamente o crearemos el usecase
    
    // Mejor creamos el GetVehicleByIdUseCase para seguir el patrón
    const { VehicleRepositoryImpl } = require('@/app/features/vehicle/repositories/vehicle.repository.impl');
    const repo = new VehicleRepositoryImpl();
    const resultById = await repo.getById(id);
    
    resultById.match(
      (data: Vehicle) => {
        setVehicle(data);
        setIsLoading(false);
      },
      () => {
        router.push('/admin/vehicles');
      }
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p>Cargando datos del vehículo...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '1rem' }}>
        <button 
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '1rem',
            fontSize: '1rem'
          }}
        >
          <span className="material-symbols-rounded">arrow_back</span>
          Editar Vehículo
        </button>
        {vehicle && <VehicleForm vehicle={vehicle} isEdit={true} />}
      </div>
    </DashboardLayout>
  );
}
