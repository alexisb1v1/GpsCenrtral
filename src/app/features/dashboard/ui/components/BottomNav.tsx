'use client';

import React from 'react';
import { LayoutDashboard, BusFront, Bell, User } from 'lucide-react';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      <button className={`${styles.navItem} ${styles.active}`}>
        <LayoutDashboard size={24} />
        <span>Panel</span>
      </button>
      <button className={styles.navItem}>
        <BusFront size={24} />
        <span>Flota</span>
      </button>
      <button className={styles.navItem}>
        <Bell size={24} />
        <span>Alertas</span>
      </button>
      <button className={styles.navItem}>
        <User size={24} />
        <span>Perfil</span>
      </button>
    </nav>
  );
}
