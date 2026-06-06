/* src/app/dashboard/page.tsx */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import StatsCard from '@/app/features/dashboard/ui/components/StatsCard';
import MonitoringTable from '@/app/features/dashboard/ui/components/MonitoringTable';
import QuickActions from '@/app/features/dashboard/ui/components/QuickActions';
import AlertsList from '@/app/features/dashboard/ui/components/AlertsList';
import PreviousTickets from '@/app/features/dashboard/ui/components/PreviousTickets';
import { DashboardApiService, DashboardMetricsDto } from '@/app/features/dashboard/services/dashboard-api.service';
import styles from './Dashboard.module.css';

// Importación dinámica de GpsMap para evitar fallos de compilación Server-Side (Leaflet/DOM dependency)
const GpsMap = dynamic(
  () => import('@/shared/components/maps/gps-map.component'),
  { ssr: false }
);

interface VehiclePosition {
  id: string;
  plate: string;
  driverName?: string;
  driverId?: string | null;
  lat: number;
  lng: number;
  speed: number;
  isActive: boolean;
  lastUpdated: string;
  dailyTicketId?: string | null;
  hasActiveTicket?: boolean;
}

const dashboardApi = new DashboardApiService();

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Estados de telemetría de WebSocket en vivo
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<any>(null);

  // Inicializar WebSocket para telemetría
  const initializeSocket = () => {
    const sessionStr = Cookies.get('gps_central_session');
    if (!sessionStr) return;

    let token = '';
    try {
      const session = JSON.parse(sessionStr);
      token = session.token || '';
    } catch (e) {
      return;
    }

    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const socketUrl = apiUrl.replace('/api/v1', '').replace('/api/v1/', '');

    const io = (window as any).io;
    if (!io) return;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('positions', (positionsData: any[]) => {
      const formattedPositions: VehiclePosition[] = positionsData.map(pos => ({
        id: pos.vehicleId || pos.deviceId,
        plate: pos.plate || `Vehículo ${pos.deviceId}`,
        driverName: pos.driverName || 'No asignado',
        driverId: pos.driverId || null,
        lat: parseFloat(pos.latitude || pos.lat),
        lng: parseFloat(pos.longitude || pos.lng),
        speed: Math.round(pos.speed || 0),
        isActive: pos.speed > 0 || pos.attributes?.motion || false,
        lastUpdated: pos.deviceTime || pos.lastUpdated || new Date().toISOString(),
        dailyTicketId: pos.dailyTicketId,
        hasActiveTicket: pos.hasActiveTicket,
      }));

      setVehicles(prevVehicles => {
        const updatedMap = new Map<string, VehiclePosition>();
        prevVehicles.forEach(v => updatedMap.set(v.id, v));
        formattedPositions.forEach(v => updatedMap.set(v.id, v));
        return Array.from(updatedMap.values());
      });
    });
  };

  useEffect(() => {
    let script: HTMLScriptElement | null = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.async = true;

    script.onload = () => {
      initializeSocket();
    };

    document.body.appendChild(script);

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Cargar métricas del backend de forma dinámica
  const loadMetrics = async (showSilence = false) => {
    if (!showSilence) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const result = await dashboardApi.getMetrics();
    if (result.success && result.data) {
      setMetrics(result.data);
      setLastUpdated(new Date());
    } else {
      console.error('Error al cargar métricas del Dashboard:', result.errorMessage || 'Error desconocido');
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    // 1. Carga inicial
    loadMetrics();

    // 2. Temporizador reactivo para refrescar datos automáticamente cada 30 segundos
    const interval = setInterval(() => {
      loadMetrics(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Formateador de moneda en Soles (S/)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className={styles.dashboardContainer}>
        {/* Cabecera del Dashboard con Indicador de Sincronización */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '0' }}>Monitoreo de Operaciones</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Estado operativo de la flota urbana en tiempo real.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                Sincronizado: {formatTime(lastUpdated)}
              </span>
            )}
            <button
              onClick={() => loadMetrics(true)}
              disabled={isRefreshing || isLoading}
              style={{
                background: 'white',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span className={`material-symbols-rounded ${isRefreshing ? 'spin-animation' : ''}`} style={{ fontSize: '16px' }}>
                sync
              </span>
              {isRefreshing ? 'Actualizando...' : 'Refrescar'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', gap: '16px' }}>
            <div className="loading-spinner-premium" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Cargando panel dinámico...</p>
          </div>
        ) : (
          <>
            {/* Mobile-First Order: Stats */}
            <div className={styles.statsSection}>
              <StatsCard 
                label="Pagos de Hoy" 
                value={metrics ? formatCurrency(metrics.kpis.totalRevenueToday) : 'S/ 0.00'} 
                trend={metrics?.kpis.revenueTrendLabel || '+12.5% vs ayer'} 
                trendType="success"
                iconName="payments"
                color="#0052cc"
              />
              <StatsCard 
                label="En Ruta" 
                value={metrics ? String(metrics.kpis.vehiclesInRouteCount).padStart(2, '0') : '00'} 
                iconName="directions_bus"
                color="#16a34a"
              />
              <StatsCard 
                label="Pendientes" 
                value={metrics ? String(metrics.kpis.vehiclesPendingCount).padStart(2, '0') : '00'} 
                iconName="schedule"
                color="#d97706"
                trendType="error"
              />
            </div>

            {/* Column Grid for Desktop / Stack for Mobile */}
            <div className={styles.mainGrid}>
              {/* Left Column (Desktop) / Main Flow (Mobile) */}
              <div className={styles.contentColumn}>
                <div className={styles.mobileQuickActions}>
                  <QuickActions />
                </div>
                
                <div className={styles.tableSection}>
                  <MonitoringTable units={metrics?.monitoringUnits || []} />
                </div>

                <div className={styles.historySection}>
                  <PreviousTickets tickets={metrics?.recentTickets || []} />
                </div>
                
                <div className={styles.mobileAlerts}>
                  <AlertsList alerts={metrics?.recentAlerts || []} />
                </div>
              </div>

              {/* Right Column (Desktop only, hidden or moved in Mobile) */}
              <div className={styles.sideColumn}>
                <div className={styles.desktopQuickActions}>
                  <QuickActions />
                </div>
                
                <div className={styles.mapWidget}>
                  <div className={styles.mapHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className={styles.mapTitle}>Monitoreo en Tiempo Real</span>
                      <h4 className={styles.locationName}>Mapa de la Flota</h4>
                    </div>
                    <span 
                      className={`${styles.statusDot} ${isSocketConnected ? styles.dotConnected : styles.dotDisconnected}`}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isSocketConnected ? '#10b981' : '#64748b',
                        display: 'inline-block',
                      }}
                      title={isSocketConnected ? 'Conectado a telemetría' : 'Desconectado'}
                    />
                  </div>
                  <div className={styles.mapPlaceholder} style={{ height: '260px', position: 'relative' }}>
                    <GpsMap
                      mode="controller"
                      vehicles={vehicles}
                    />
                  </div>
                </div>

                <div className={styles.desktopAlerts}>
                  <AlertsList alerts={metrics?.recentAlerts || []} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Estilos CSS Inline para soporte de animación sync y spin */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
      `}</style>
    </DashboardLayout>
  );
}
