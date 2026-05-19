/* src/app/admin/drivers/create/page.tsx */
'use client';

import React from 'react';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import DriverForm from '../components/DriverForm';
import { useRouter } from 'next/navigation';

export default function CreateDriverPage() {
  const router = useRouter();

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
          Registrar Chofer
        </button>
        <DriverForm />
      </div>
    </DashboardLayout>
  );
}
