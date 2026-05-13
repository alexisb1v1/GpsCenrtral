import React from 'react';
import { Search, Calendar } from 'lucide-react';
import styles from './PreviousTickets.module.css';

const MOCK_TICKETS = [
  {
    id: 1,
    time: '10:45 AM',
    day: 'Hoy',
    unit: 'Unidad V-203',
    ticketNumber: '#TK-98231',
    status: 'Despachado'
  },
  {
    id: 2,
    time: '09:30 AM',
    day: 'Hoy',
    unit: 'Unidad V-112',
    ticketNumber: '#TK-98230',
    status: 'Despachado'
  }
];

export default function PreviousTickets() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Tickets de Salida Anteriores</h3>
        <div className={styles.filters}>
          <div className={styles.dateInputWrapper}>
            <input type="text" placeholder="mm/dd/yyyy" className={styles.dateInput} />
            <span className={`material-symbols-rounded ${styles.calendarIcon}`} style={{ fontSize: '18px' }}>
              calendar_today
            </span>
          </div>
          <button className={styles.filterBtn}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>search</span>
            Filtrar
          </button>
        </div>
      </div>

      <div className={styles.ticketList}>
        {MOCK_TICKETS.map(ticket => (
          <div key={ticket.id} className={styles.ticketCard}>
            <div className={styles.timeInfo}>
              <span className={styles.time}>{ticket.time}</span>
              <span className={styles.day}>{ticket.day}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.unitInfo}>
              <span className={styles.unitName}>{ticket.unit}</span>
              <span className={styles.ticketNum}>Ticket {ticket.ticketNumber}</span>
            </div>
            <div className={styles.statusBadge}>
              {ticket.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
