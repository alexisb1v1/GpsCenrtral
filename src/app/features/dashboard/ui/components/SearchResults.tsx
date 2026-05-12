'use client';

import React from 'react';
import { Bus, User, Route as RouteIcon, FileText, ChevronRight } from 'lucide-react';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  query: string;
  onClose: () => void;
}

export default function SearchResults({ query, onClose }: SearchResultsProps) {
  if (!query) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>UNIDADES (UNITS)</span>
            <span className={styles.resultsCount}>2 resultados</span>
          </div>
          <div className={styles.resultItem}>
            <div className={`${styles.iconBox} ${styles.blue}`}>
              <Bus size={20} />
            </div>
            <div className={styles.resultContent}>
              <div className={styles.resultMain}>
                <span className={styles.resultName}>V-102</span>
                <span className={styles.statusBadge}>EN TERMINAL</span>
              </div>
              <span className={styles.resultSub}>ABC-1234 • Ruta Norte Express</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>CONDUCTORES (DRIVERS)</span>
          </div>
          <div className={styles.resultItem}>
            <div className={styles.avatarBox}>
              <img src="https://ui-avatars.com/api/?name=Victor+Manuel&background=random" alt="Driver" />
            </div>
            <div className={styles.resultContent}>
              <div className={styles.resultMain}>
                <span className={styles.resultName}>Víctor Manuel V-1</span>
              </div>
              <span className={styles.resultSub}>Asignado a: Unidad V-102</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>RUTAS (ROUTES)</span>
          </div>
          <div className={styles.resultItem}>
            <div className={`${styles.iconBox} ${styles.gray}`}>
              <RouteIcon size={20} />
            </div>
            <div className={styles.resultContent}>
              <div className={styles.resultMain}>
                <span className={styles.resultName}>Ruta V-1 Industrial</span>
              </div>
              <span className={styles.resultSub}>8 unidades activas • 12.4 km</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span>Presiona <kbd className={styles.kbdKey}>ESC</kbd> para cerrar</span>
          <a href="#" className={styles.viewAll}>Ver todos los resultados</a>
        </div>
      </div>
    </div>
  );
}
