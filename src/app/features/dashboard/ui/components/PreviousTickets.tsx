/* src/app/features/dashboard/ui/components/PreviousTickets.tsx */
import React from 'react';
import styles from './PreviousTickets.module.css';

export interface RecentTicket {
  id: string;
  ticketNumber: string;
  vehiclePlate: string;
  totalAmount: number;
  dispatchedAt: string;
}

interface PreviousTicketsProps {
  tickets?: RecentTicket[];
}

export default function PreviousTickets({ tickets = [] }: PreviousTicketsProps) {
  // Obtener hora amigable
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Formateador de Soles
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Últimos Despachos / Pagos (Hoy)</h3>
        <div className={styles.filters} style={{ display: 'none' }}>
          {/* Ocultar filtros estáticos para mantener la boleta limpia y en caliente */}
        </div>
      </div>

      <div className={styles.ticketList}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px', width: '100%' }}>
            No se han registrado tickets de salida hoy.
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className={styles.ticketCard} style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className={styles.timeInfo}>
                <span className={styles.time}>{formatTime(ticket.dispatchedAt)}</span>
                <span className={styles.day}>Hoy</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.unitInfo} style={{ flex: 1 }}>
                <span className={styles.unitName}>Vehículo: {ticket.vehiclePlate}</span>
                <span className={styles.ticketNum}>Nro. {ticket.ticketNumber}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px' }}>
                  {formatCurrency(ticket.totalAmount)}
                </span>
                <div className={styles.statusBadge} style={{ background: '#eff6ff', color: '#0052cc', fontWeight: 700 }}>
                  Despachado
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
