'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardLayout.module.css';
import { AccessControl } from '@/app/shared/utils/access-control';
import { useSilentRefresh } from '@/app/features/auth/hooks/useSilentRefresh';

export default function DashboardLayout({
  children,
  noPadding = false,
  hideBottomNav = false,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
  hideBottomNav?: boolean;
}) {
  useSilentRefresh(); // Iniciar silent refresh de token
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.user?.role) {
          setUserRole(session.user.role);
        }
      } catch (e) {
        console.error('Error al cargar la sesión en el layout', e);
      }
    }
    setIsLoading(false);
  }, []);

  const hasAccess = AccessControl.hasAccess(userRole, pathname);

  const handleGoHome = () => {
    if (userRole === 'DRIVER') {
      window.location.href = '/driver';
    } else {
      window.location.href = '/dashboard';
    }
  };

  const renderRestricted = () => (
    <div className={styles.restrictedContainer}>
      <div className={styles.restrictedCard}>
        <div className={styles.restrictedIconWrapper}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>
            block
          </span>
        </div>
        <h2 className={styles.restrictedTitle}>Acceso Restringido</h2>
        <p className={styles.restrictedMessage}>
          Tu perfil de usuario no cuenta con los permisos necesarios para acceder a este módulo.
          <span className={styles.restrictedPath}>{pathname}</span>
        </p>
        <button className={styles.restrictedButton} onClick={handleGoHome}>
          <span className="material-symbols-rounded">home</span>
          {userRole === 'DRIVER' ? 'Ir al Mapa de mi Unidad' : 'Ir al Panel de Control'}
        </button>
      </div>
    </div>
  );

  const renderLoader = () => (
    <div className={styles.loaderContainer}>
      <div className={styles.loader} />
    </div>
  );

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={styles.mainContent}>
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className={`${styles.pageContent} ${noPadding ? styles.noPadding : ''}`}>
          {isLoading ? renderLoader() : (hasAccess ? children : renderRestricted())}
        </main>
      </div>
    </div>
  );
}
