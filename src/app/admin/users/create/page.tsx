/* src/app/admin/users/create/page.tsx */
'use client';

import React from 'react';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import UserForm from '../components/UserForm';

export default function CreateUserPage() {
  return (
    <DashboardLayout>
      <UserForm />
    </DashboardLayout>
  );
}
