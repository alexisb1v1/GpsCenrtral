import React from 'react';
import { MoreVertical, Bus } from 'lucide-react';
import styles from './MonitoringTable.module.css';

const mockData = [
  { id: 'UNIT-402', unit: 'Ruta A-15', driver: 'Juan P.', status: 'Listo', statusColor: '#22c55e', statusBg: '#f0fdf4' },
  { id: 'UNIT-215', unit: 'Ruta B-02', driver: 'Maria L.', status: 'Cargando', statusColor: '#d97706', statusBg: '#fffbeb' },
];

export default function MonitoringTable() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Unidades en Paradero</h2>
        <div className={styles.desktopFilters}>
          <span className={styles.filterBadge}>EN PARADERO</span>
          <span className={`${styles.filterBadge} ${styles.inactive}`}>EN CAMINO</span>
        </div>
        <a href="#" className={styles.viewAll}>Ver todas (12)</a>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {/* ... table content remains same for desktop ... */}
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Conductor</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((item) => (
              <tr key={item.id}>
                <td><div className={styles.unitId}>{item.id}</div></td>
                <td><span className={styles.driverName}>{item.driver}</span></td>
                <td>
                  <div className={styles.statusWrapper}>
                    <span className={styles.statusDot} style={{ backgroundColor: item.statusColor }} />
                    <span className={styles.statusText} style={{ color: item.statusColor }}>{item.status}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className={styles.actionBtn}>
                    <span className="material-symbols-rounded">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Version List (Redesigned) */}
      <div className={styles.mobileList}>
        {mockData.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <div className={styles.cardMain}>
              <div className={styles.busIconBox}>
                <span className="material-symbols-rounded">directions_bus</span>
              </div>
              <div className={styles.unitInfo}>
                <h4 className={styles.mobileUnitName}>{item.id}</h4>
                <p className={styles.mobileDriver}>Conductor: {item.driver}</p>
              </div>
            </div>
            <div className={styles.cardActions}>
              <span 
                className={styles.mobileStatusBadge} 
                style={{ color: item.statusColor, backgroundColor: item.statusBg }}
              >
                {item.status}
              </span>
              <button className={styles.moreBtn}>
                <span className="material-symbols-rounded">more_vert</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
