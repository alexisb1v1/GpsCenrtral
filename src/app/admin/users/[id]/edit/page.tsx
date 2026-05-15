/* src/app/admin/users/[id]/edit/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import UserForm from '../../../components/UserForm';
import { getUserByIdUseCase, User } from '@/app/features/user';
import styles from '../../../Users.module.css';

export default function EditUserPage() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    setIsLoading(true);
    const result = await getUserByIdUseCase.execute(id as string);
    
    result.match(
      (data) => {
        setUser(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className={styles.loading} style={{ minHeight: '60vh' }}>
          <div className={styles.spinner} />
          <p>Cargando datos del usuario...</p>
        </div>
      ) : error || !user ? (
        <div className={styles.loading} style={{ minHeight: '60vh' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '1rem' }}>error</span>
          <p>{error || 'No se encontró el usuario'}</p>
        </div>
      ) : (
        <UserForm initialData={user} isEdit={true} />
      )}
    </DashboardLayout>
  );
}
