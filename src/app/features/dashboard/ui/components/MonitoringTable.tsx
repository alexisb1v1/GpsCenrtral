import React from 'react';
import { MoreVertical } from 'lucide-react';
import styles from './MonitoringTable.module.css';

const mockData = [
  { id: 'V-102', unit: 'Ruta A-15', driver: 'Carlos Méndez', status: 'Listo para Salida', statusColor: '#22c55e' },
  { id: 'V-405', unit: 'Ruta B-02', driver: 'Elena Rodríguez', status: 'En Maniobras', statusColor: '#3b82f6' },
  { id: 'V-089', unit: 'Ruta C-10', driver: 'Juan Pérez', status: 'Salida Reciente', statusColor: '#64748b' },
];

export default function MonitoringTable() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Monitoreo en Tiempo Real</h2>
        <div className={styles.filters}>
          <span className={styles.filterBadge}>EN PARADERO</span>
          <span className={`${styles.filterBadge} ${styles.inactive}`}>EN CAMINO</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Ruta / Línea</th>
              <th>Conductor</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={styles.unitId}>{item.id}</div>
                </td>
                <td>
                  <span className={styles.routeName}>{item.unit}</span>
                </td>
                <td>
                  <span className={styles.driverName}>{item.driver}</span>
                </td>
                <td>
                  <div className={styles.statusWrapper}>
                    <span className={styles.statusDot} style={{ backgroundColor: item.statusColor }} />
                    <span className={styles.statusText} style={{ color: item.statusColor }}>{item.status}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className={styles.actionBtn}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Version List */}
      <div className={styles.mobileList}>
        {mockData.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <div className={styles.mobileCardHeader}>
              <div className={styles.unitId}>{item.id}</div>
              <button className={styles.actionBtn}>
                <MoreVertical size={18} />
              </button>
            </div>
            <div className={styles.mobileCardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ruta:</span>
                <span className={styles.infoValue}>{item.unit}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Conductor:</span>
                <span className={styles.infoValue}>{item.driver}</span>
              </div>
              <div className={styles.statusWrapper}>
                <span className={styles.statusDot} style={{ backgroundColor: item.statusColor }} />
                <span className={styles.statusText} style={{ color: item.statusColor }}>{item.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
