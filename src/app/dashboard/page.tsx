import React from 'react';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import StatsCard from '@/app/features/dashboard/ui/components/StatsCard';
import MonitoringTable from '@/app/features/dashboard/ui/components/MonitoringTable';
import QuickActions from '@/app/features/dashboard/ui/components/QuickActions';
import AlertsList from '@/app/features/dashboard/ui/components/AlertsList';
import PreviousTickets from '@/app/features/dashboard/ui/components/PreviousTickets';
import { Route, Clock, CreditCard, MapPin } from 'lucide-react';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className={styles.dashboardContainer}>
        {/* Mobile-First Order: Stats */}
        <div className={styles.statsSection}>
          <div className={styles.principalStat}>
            <StatsCard 
              label="Pagos de Hoy" 
              value="$4,250.00" 
              trend="+12% vs ayer" 
              trendType="success"
              iconName="payments"
              color="#2563eb"
              variant="principal"
            />
          </div>
          <div className={styles.secondaryStats}>
            <StatsCard 
              label="En Ruta" 
              value="18" 
              iconName="directions_bus"
              color="#2563eb"
            />
            <StatsCard 
              label="Pendientes" 
              value="04" 
              iconName="schedule"
              color="#dc2626"
              trendType="error"
            />
          </div>
        </div>

        {/* Column Grid for Desktop / Stack for Mobile */}
        <div className={styles.mainGrid}>
          {/* Left Column (Desktop) / Main Flow (Mobile) */}
          <div className={styles.contentColumn}>
            <div className={styles.mobileQuickActions}>
              <QuickActions />
            </div>
            
            <div className={styles.tableSection}>
              <MonitoringTable />
            </div>

            <div className={styles.historySection}>
              <PreviousTickets />
            </div>
            
            <div className={styles.mobileAlerts}>
              <AlertsList />
            </div>
          </div>

          {/* Right Column (Desktop only, hidden or moved in Mobile) */}
          <div className={styles.sideColumn}>
            <div className={styles.desktopQuickActions}>
              <QuickActions />
            </div>
            
            <div className={styles.mapWidget}>
              {/* ... map content ... */}
              <div className={styles.mapHeader}>
                <span className={styles.mapTitle}>Paradero Actual</span>
                <h4 className={styles.locationName}>Estación Central Sur</h4>
              </div>
              <div className={styles.mapPlaceholder}>
                <img src="/map_placeholder.png" alt="Map" className={styles.mapImage} />
                <div className={styles.mapOverlay}>
                  <span className={`material-symbols-rounded ${styles.mapPin}`} style={{ fontSize: '32px' }}>
                    location_on
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.desktopAlerts}>
              <AlertsList />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
