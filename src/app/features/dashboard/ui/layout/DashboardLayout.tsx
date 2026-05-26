'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardLayout.module.css';
import BottomNav from '@/app/features/dashboard/ui/components/BottomNav';

export default function DashboardLayout({ 
  children,
  noPadding = false,
  hideBottomNav = false,
}: { 
  children: React.ReactNode;
  noPadding?: boolean;
  hideBottomNav?: boolean;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={styles.mainContent}>
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className={`${styles.pageContent} ${noPadding ? styles.noPadding : ''}`}>
          {children}
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
