'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import Cookies from 'js-cookie';
import { logoutUseCase } from '@/app/features/auth';
import { useBranding } from '@/app/shared/providers/BrandingContext';

const mainMenuItems = [
  { id: 'dashboard', label: 'Panel de Control', icon: 'dashboard', href: '/dashboard' },
  { id: 'fleet', label: 'Monitoreo de Flota', icon: 'directions_bus', href: '/fleet' },
  { id: 'payments', label: 'Registro de Salida', icon: 'payments', href: '/payments' },
  { id: 'penalties', label: 'Sanciones', icon: 'gavel', href: '/penalties' },
  { id: 'history', label: 'Historial de Salidas', icon: 'history', href: '/history' },
];

const adminMenuItems = [
  { id: 'tenants', label: 'Gestión de Empresas', icon: 'corporate_fare', href: '/admin/tenants' },
  { id: 'vehicles', label: 'Gestión de Flota', icon: 'directions_bus', href: '/admin/vehicles' },
  { id: 'drivers', label: 'Gestión de Choferes', icon: 'badge', href: '/admin/drivers' },
  { id: 'routes', label: 'Rutas y Paraderos', icon: 'alt_route', href: '/admin/routes' },
  { id: 'users', label: 'Gestión de Usuarios', icon: 'group', href: '/admin/users' },
  { id: 'branding', label: 'Personalización', icon: 'palette', href: '/admin/branding' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { branding } = useBranding();
  const [userName, setUserName] = useState('Usuario');

  useEffect(() => {
    // Cargar nombre del usuario desde la sesión
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.user?.name) {
          setUserName(session.user.name);
        }
      } catch (e) {
        console.error('Error parsing session for sidebar', e);
      }
    }
  }, []);

  const tenantDisplayName = branding?.name || 'Vectura';
  const primaryColor = branding?.colors?.primary || '#0052cc';

  const handleLogout = async () => {
    await logoutUseCase.execute();
    window.location.href = '/login';
  };

  const renderMenuItems = (items: typeof mainMenuItems) => (
    items.map((item) => {
      const isActive = pathname === item.href;
      
      return (
        <Link 
          key={item.id} 
          href={item.href}
          className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          onClick={onClose}
        >
          <div className={styles.iconWrapper}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>
              {item.icon}
            </span>
          </div>
          <span className={styles.label}>{item.label}</span>
          {isActive && <div className={styles.activeIndicator} />}
        </Link>
      );
    })
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <button className={styles.closeBtn} onClick={onClose}>
          <span className="material-symbols-rounded">close</span>
        </button>

        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.brand} style={{ color: primaryColor }}>{tenantDisplayName}</span>
            <span className={styles.subBrand}>Fleet Operations</span>
          </div>
        </div>

      <nav className={styles.nav}>
        <div className={styles.section}>
          {renderMenuItems(mainMenuItems)}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Administración</h3>
          {renderMenuItems(adminMenuItems)}
        </div>
      </nav>

      <div className={styles.footer}>
        <Link href="/settings" className={styles.footerItem}>
          <span className="material-symbols-rounded">settings</span>
          <span>Configuración</span>
        </Link>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className="material-symbols-rounded">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
      </aside>
    </>
  );
}
