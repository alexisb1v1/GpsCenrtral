'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BusFront, 
  Wallet, 
  AlertTriangle, 
  History, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import styles from './Sidebar.module.css';

const menuItems = [
  { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'fleet', label: 'Monitoreo de Flota', icon: BusFront, href: '/fleet' },
  { id: 'payments', label: 'Pagos', icon: Wallet, href: '/payments' },
  { id: 'penalties', label: 'Sanciones', icon: AlertTriangle, href: '/penalties' },
  { id: 'history', label: 'Historial de Salidas', icon: History, href: '/history' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <span className={styles.brand}>Vectura</span>
          <span className={styles.subBrand}>Gestión de Flota</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.id} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} />
              </div>
              <span className={styles.label}>{item.label}</span>
              {isActive && <div className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <Link href="/settings" className={styles.footerItem}>
          <Settings size={20} />
          <span>Configuración</span>
        </Link>
        <button className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
