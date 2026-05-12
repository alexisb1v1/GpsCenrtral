import React from 'react';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import StatsCard from '@/app/features/dashboard/ui/components/StatsCard';
import MonitoringTable from '@/app/features/dashboard/ui/components/MonitoringTable';
import QuickActions from '@/app/features/dashboard/ui/components/QuickActions';
import AlertsList from '@/app/features/dashboard/ui/components/AlertsList';
import { Route, Clock, CreditCard, MapPin } from 'lucide-react';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className={styles.grid}>
        {/* Left Column: Stats and Table */}
        <div className={styles.leftColumn}>
          <div className={styles.statsRow}>
            <StatsCard 
              label="Unidades en Ruta" 
              value="24" 
              trend="+12%" 
              trendType="success"
              icon={Route}
              subtitle="Real-time"
              color="#2563eb"
            />
            <StatsCard 
              label="Pendientes de Salida" 
              value="08" 
              trend="Alerta" 
              trendType="warning"
              icon={Clock}
              subtitle="Prioridad"
              color="#d97706"
            />
            <StatsCard 
              label="Pagos Registrados Hoy" 
              value="$1,450" 
              icon={CreditCard}
              subtitle="Hoy"
              color="#16a34a"
            />
          </div>

          <div className={styles.tableSection}>
            <MonitoringTable />
          </div>
        </div>

        {/* Right Column: Actions, Map, Alerts */}
        <div className={styles.rightColumn}>
          <QuickActions />
          
          <div className={styles.mapWidget}>
            <div className={styles.mapHeader}>
              <span className={styles.mapTitle}>Paradero Actual</span>
              <h4 className={styles.locationName}>Estación Central Sur</h4>
              <p className={styles.locationDetail}>Capacidad: 12 unidades en dársena</p>
            </div>
            <div className={styles.mapPlaceholder}>
              <img src="/map_placeholder.png" alt="Map" className={styles.mapImage} />
              <div className={styles.mapOverlay}>
                <MapPin className={styles.mapPin} size={32} />
              </div>
            </div>
            <div className={styles.mapFooter}>
              <div className={styles.statusBadge}>
                <span className={styles.dot} />
                Operando normalmente
              </div>
            </div>
          </div>

          <AlertsList />
        </div>
      </div>
    </DashboardLayout>
  );
}
