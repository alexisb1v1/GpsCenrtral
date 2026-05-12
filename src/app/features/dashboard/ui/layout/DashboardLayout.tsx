import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardLayout.module.css';
import BottomNav from '@/app/features/dashboard/ui/components/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <TopBar />
        <main className={styles.pageContent}>
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
