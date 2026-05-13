import React from 'react';
import { Search, Ticket } from 'lucide-react';
import styles from './TicketConsultation.module.css';

export default function TicketConsultation() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Ticket size={20} />
        </div>
        <h3 className={styles.title}>Consulta de Ticket</h3>
      </div>
      
      <p className={styles.description}>
        Ingresa el folio para verificar el estado y los detalles de la salida.
      </p>

      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={18} />
        <input 
          type="text" 
          placeholder="Ej: ABC-12345" 
          className={styles.input}
        />
        <button className={styles.button}>Consultar</button>
      </div>

      <div className={styles.recentSearches}>
        <span className={styles.recentLabel}>Búsquedas recientes:</span>
        <div className={styles.tags}>
          <span className={styles.tag}>V-102</span>
          <span className={styles.tag}>V-115</span>
        </div>
      </div>
    </div>
  );
}
