import Link from 'next/link';
import styles from './QuickActions.module.css';

export default function QuickActions() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Acciones Rápidas</h3>
      <div className={styles.actionsGrid}>
        <Link 
          href="/payments" 
          className={`${styles.actionBtn} ${styles.primary}`}
          style={{ textDecoration: 'none' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>payments</span>
          <span className={styles.label}>Registrar Pago</span>
        </Link>

        <button 
          className={`${styles.actionBtn} ${styles.secondary}`}
          style={{ cursor: 'not-allowed', opacity: 0.65 }}
          disabled
        >
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>gavel</span>
          <span className={styles.label}>Registrar Penalidad</span>
        </button>
      </div>
    </div>
  );
}
