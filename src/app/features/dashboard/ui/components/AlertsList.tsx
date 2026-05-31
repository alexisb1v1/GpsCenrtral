/* src/app/features/dashboard/ui/components/AlertsList.tsx */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './AlertsList.module.css';

export interface RecentAlert {
  id: string;
  vehiclePlate: string;
  type: string;
  amount: number;
  detail: string;
  createdAt: string;
}

interface AlertsListProps {
  alerts?: RecentAlert[];
}

export default function AlertsList({ alerts = [] }: AlertsListProps) {
  // Traducir los tipos de infracción del backend
  const getInfractionLabel = (type: string) => {
    switch (type) {
      case 'PIRATERIA':
        return 'Piratería / Desvío';
      case 'EVASION_PAGO':
        return 'Evasión de Pago';
      case 'RETRASO_RUTA':
        return 'Retraso de Horario';
      default:
        return type;
    }
  };

  // Formateador de Soles
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  // Obtener hora amigable
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>INFRACCIONES DE HOY (ALERTAS)</h3>
      <div className={styles.list}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '12px' }}>
            No se han registrado infracciones en la jornada de hoy.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={styles.alertItem} style={{ borderLeft: '3.5px solid #ef4444' }}>
              <div className={styles.iconWrapper} style={{ color: '#ef4444' }}>
                <AlertCircle size={18} />
              </div>
              <div className={styles.content} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={styles.alertTitle} style={{ fontWeight: 800 }}>
                    {getInfractionLabel(alert.type)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                    {formatTime(alert.createdAt)}
                  </span>
                </div>
                <span className={styles.alertDetail} style={{ fontSize: '12px', display: 'block', marginTop: '2px', color: '#64748b' }}>
                  {alert.detail} [Placa: <strong>{alert.vehiclePlate}</strong>]
                </span>
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                  Sanción: {formatCurrency(alert.amount)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
