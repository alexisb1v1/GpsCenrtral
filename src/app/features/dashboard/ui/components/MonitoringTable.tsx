/* src/app/features/dashboard/ui/components/MonitoringTable.tsx */
import React from 'react';
import styles from './MonitoringTable.module.css';

export interface MonitoringUnit {
  id: string;
  vehiclePlate: string;
  vehicleNumber: string | null;
  driverName: string;
  routeName: string;
  direction: string;
  dispatchedAt: string;
}

interface MonitoringTableProps {
  units?: MonitoringUnit[];
}

export default function MonitoringTable({ units = [] }: MonitoringTableProps) {
  // Formateador de fecha/hora en formato local amigable
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Unidades Despachadas (Hoy)</h2>
        <div className={styles.desktopFilters}>
          <span className={styles.filterBadge}>EN RUTA</span>
          <span className={`${styles.filterBadge} ${styles.inactive}`}>EN PARADERO</span>
        </div>
        <span className={styles.viewAll}>Total hoy: {units.length}</span>
      </div>

      <div className={styles.tableWrapper}>
        {units.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>
            No hay unidades despachadas registradas hoy.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Placa Vehículo</th>
                <th>Conductor</th>
                <th>Ruta / Sentido</th>
                <th>Hora Salida</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {units.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div className={styles.unitId} style={{ fontWeight: 700 }}>{item.vehiclePlate}</div>
                      {item.vehicleNumber && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Unidad #{item.vehicleNumber}</span>
                      )}
                    </div>
                  </td>
                  <td><span className={styles.driverName}>{item.driverName}</span></td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {item.routeName} ({item.direction})
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                      {formatTime(item.dispatchedAt)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.statusWrapper}>
                      <span className={styles.statusDot} style={{ backgroundColor: '#16a34a' }} />
                      <span className={styles.statusText} style={{ color: '#16a34a', fontWeight: 700 }}>En Ruta</span>
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
        )}
      </div>

      {/* Mobile Version List (Redesigned) */}
      <div className={styles.mobileList}>
        {units.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>
            No hay unidades despachadas hoy.
          </div>
        ) : (
          units.map((item) => (
            <div key={item.id} className={styles.mobileCard}>
              <div className={styles.cardMain}>
                <div className={styles.busIconBox} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <span className="material-symbols-rounded">directions_bus</span>
                </div>
                <div className={styles.unitInfo}>
                  <h4 className={styles.mobileUnitName} style={{ fontWeight: 800 }}>{item.vehiclePlate}</h4>
                  <p className={styles.mobileDriver} style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                    Chofer: <strong>{item.driverName}</strong>
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    {item.routeName} ({item.direction}) • Salida: {formatTime(item.dispatchedAt)}
                  </p>
                </div>
              </div>
              <div className={styles.cardActions} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span 
                  className={styles.mobileStatusBadge} 
                  style={{ color: '#16a34a', backgroundColor: '#f0fdf4', fontWeight: 700 }}
                >
                  En Ruta
                </span>
                <button className={styles.moreBtn}>
                  <span className="material-symbols-rounded">more_vert</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
