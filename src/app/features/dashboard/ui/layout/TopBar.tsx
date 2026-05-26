'use client';
import React, { useState, useEffect } from 'react';
import styles from './TopBar.module.css';
import Cookies from 'js-cookie';
import SearchResults from '@/app/features/dashboard/ui/components/SearchResults';
import { useBranding } from '@/app/shared/providers/BrandingContext';

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { branding } = useBranding();
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('Administrador');

  const tenantName = branding?.name || 'Vectura';

  useEffect(() => {
    // Cargar datos del usuario desde la sesión
    const sessionStr = Cookies.get('gps_central_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.user?.name) {
          setUserName(session.user.name);
          if (session.user.role) {
            setUserRole(session.user.role);
          }
        }
      } catch (e) {}
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick}>
          <span className="material-symbols-rounded">menu</span>
        </button>
        <span className={styles.mobileLogo}>{tenantName}</span>
        <h1 className={styles.title}>Panel de Control</h1>
      </div>

      <div className={styles.center}>
        <div className={`${styles.searchWrapper} ${isSearchFocused ? styles.focused : ''}`}>
          <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            placeholder="Buscar unidad o ticket..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {searchQuery && (
            <div className={styles.searchShortcut}>ESC</div>
          )}

          {searchQuery && isSearchFocused && (
            <SearchResults
              query={searchQuery}
              onClose={() => setIsSearchFocused(false)}
            />
          )}
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn}>
          <span className="material-symbols-rounded">notifications</span>
          <span className={styles.badge} />
        </button>

        <div className={styles.profile}>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{userName}</span>
            <span className={styles.profileRole}>{userRole}</span>
          </div>
          <div className={styles.avatar}>
            <div className={styles.initialsAvatar}>
              {getInitials(userName)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
