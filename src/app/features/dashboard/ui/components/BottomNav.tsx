import styles from './BottomNav.module.css';

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      <button className={`${styles.navItem} ${styles.active}`}>
        <span className={`material-symbols-rounded ${styles.navIcon}`}>dashboard</span>
        <span>Panel</span>
      </button>
      <button className={styles.navItem}>
        <span className={`material-symbols-rounded ${styles.navIcon}`}>directions_bus</span>
        <span>Flota</span>
      </button>
      <button className={styles.navItem}>
        <span className={`material-symbols-rounded ${styles.navIcon}`}>notifications</span>
        <span>Alertas</span>
      </button>
      <button className={styles.navItem}>
        <span className={`material-symbols-rounded ${styles.navIcon}`}>person</span>
        <span>Perfil</span>
      </button>
    </nav>
  );
}
