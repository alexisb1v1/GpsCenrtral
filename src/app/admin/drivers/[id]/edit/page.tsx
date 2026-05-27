/* src/app/admin/drivers/[id]/edit/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import DriverForm from '../../components/DriverForm';
import { getDriverByIdUseCase, Driver } from '@/app/features/driver';

export default function EditDriverPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDriver();
    }
  }, [id]);

  const loadDriver = async () => {
    const result = await getDriverByIdUseCase.execute(id);
    result.match(
      (data: Driver) => {
        setDriver(data);
        setIsLoading(false);
      },
      () => {
        router.push('/admin/drivers');
      }
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p>Cargando datos del chofer...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div >
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
          Editar Chofer
        </button>
        {driver && <DriverForm driver={driver} isEdit={true} />}
      </div>
    </DashboardLayout>
  );
}
