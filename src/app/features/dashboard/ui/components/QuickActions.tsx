import styles from './QuickActions.module.css';

export default function QuickActions() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Acciones Rápidas</h3>
      <div className={styles.actionsGrid}>
        <button className={`${styles.actionBtn} ${styles.primary}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>payments</span>
          <span className={styles.label}>Registrar Pago</span>
        </button>

        <button className={`${styles.actionBtn} ${styles.secondary}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>gavel</span>
          <span className={styles.label}>Registrar Penalidad</span>
        </button>
      </div>
    </div>
  );
}
