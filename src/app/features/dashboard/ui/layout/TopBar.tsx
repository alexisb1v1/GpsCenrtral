'use client';

import React, { useState } from 'react';
import { Search, Bell, HelpCircle, Grid } from 'lucide-react';
import styles from './TopBar.module.css';
import SearchResults from '@/app/features/dashboard/ui/components/SearchResults';

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>Panel de Control - Paradero</h1>
      </div>

      <div className={styles.center}>
        <div className={`${styles.searchWrapper} ${isSearchFocused ? styles.focused : ''}`}>
          <Search size={18} className={styles.searchIcon} />
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
          <Bell size={20} />
          <span className={styles.badge} />
        </button>
        <button className={styles.iconBtn}>
          <HelpCircle size={20} />
        </button>
        <button className={styles.iconBtn}>
          <Grid size={20} />
        </button>
        
        <div className={styles.profile}>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Marcos Pérez</span>
            <span className={styles.profileRole}>Fleet Manager</span>
          </div>
          <div className={styles.avatar}>
            <img src="https://ui-avatars.com/api/?name=Marcos+Perez&background=0D8ABC&color=fff" alt="User" />
          </div>
        </div>
      </div>
    </header>
  );
}
