import React from 'react';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import styles from './AlertsList.module.css';

const alerts = [
  { id: 1, type: 'error', icon: AlertCircle, title: 'Demora en Unidad V-089', detail: '5 min retraso en Ruta C-10', color: '#ef4444' },
  { id: 2, type: 'info', icon: RefreshCw, title: 'Cambio de Turno', detail: 'Ingreso de Operador Nocturno', color: '#3b82f6' },
];

export default function AlertsList() {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>ALERTAS RECIENTES</h3>
      <div className={styles.list}>
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div key={alert.id} className={styles.alertItem}>
              <div className={styles.iconWrapper} style={{ color: alert.color }}>
                <Icon size={20} />
              </div>
              <div className={styles.content}>
                <span className={styles.alertTitle}>{alert.title}</span>
                <span className={styles.alertDetail}>{alert.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
