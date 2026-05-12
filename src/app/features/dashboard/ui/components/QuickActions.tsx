import React from 'react';
import { CreditCard, ShieldAlert, ChevronRight } from 'lucide-react';
import styles from './QuickActions.module.css';

export default function QuickActions() {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Acciones Rápidas</h3>
      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.primary}`}>
          <div className={styles.iconWrapper}>
            <CreditCard size={20} />
          </div>
          <span className={styles.label}>Registrar Pago</span>
          <ChevronRight size={18} className={styles.chevron} />
        </button>

        <button className={`${styles.actionBtn} ${styles.secondary}`}>
          <div className={styles.iconWrapper}>
            <ShieldAlert size={20} />
          </div>
          <span className={styles.label}>Registrar Penalidad</span>
          <ChevronRight size={18} className={styles.chevron} />
        </button>
      </div>
    </div>
  );
}
