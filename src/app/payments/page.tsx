'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentApiService, DailyTicketDto } from '@/app/features/payments/services/payment-api.service';
import { VehicleApiService } from '@/app/features/vehicle/services/vehicle-api.service';
import { DriverApiService } from '@/app/features/driver/services/driver-api.service';
import { RouteApiService } from '@/app/features/route/services/route-api.service';
import { VehicleDto } from '@/app/features/vehicle/dto/vehicle.dto';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import PrintTicketModal, { PrintTicketData } from '@/app/shared/components/PrintTicketModal';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import styles from '../admin/AdminList.module.css';

const paymentApi = new PaymentApiService();
const vehicleApi = new VehicleApiService();
const driverApi = new DriverApiService();
const routeApi = new RouteApiService();

export default function PaymentsPage() {
  const router = useRouter();
  const { branding, slug } = useBranding();
  const [tickets, setTickets] = useState<DailyTicketDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'hoy' | 'semana'>('hoy');
  const [currentPage, setCurrentPage] = useState(1);
  const [routes, setRoutes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const itemsPerPage = 10;

  // Estados para Impresión de Ticket de Salida
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTicketData, setPrintTicketData] = useState<PrintTicketData | null>(null);

  useEffect(() => {
    loadData();
  }, [timeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar tickets del backend real
      const ticketsRes = await paymentApi.getTickets();

      // 2. Cargar vehículos
      const vehiclesRes = await vehicleApi.getAll();

      // 3. Cargar rutas
      const routesRes = await routeApi.getList();

      // 4. Cargar choferes
      const driversRes = await driverApi.getAll();

      if (ticketsRes.success && ticketsRes.data) {
        setTickets(ticketsRes.data);
      }
      if (vehiclesRes.success && vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
      }
      if (routesRes.success && routesRes.data) {
        setRoutes(routesRes.data);
      }
      if (driversRes.success && driversRes.data) {
        setDrivers(driversRes.data);
      }
    } catch (e) {
      console.error('Error al cargar datos en gestión de tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de tickets por búsqueda
  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    const ticketIdMatch = ticket.id.toLowerCase().includes(searchLower) || `#TK-${ticket.id.substring(0, 4)}`.toLowerCase().includes(searchLower);
    const vehicleMatch = ticket.vehicle?.plate.toLowerCase().includes(searchLower) || ticket.vehicle?.number.toLowerCase().includes(searchLower);
    const driverMatch = ticket.driver?.name.toLowerCase().includes(searchLower);

    // Si la relación en el ticket está incompleta, buscamos en local
    let localVehicleMatch = false;
    if (!ticket.vehicle && vehicles.length > 0) {
      const v = vehicles.find(item => item.id === ticket.vehicleId);
      if (v) {
        localVehicleMatch = v.plate.toLowerCase().includes(searchLower) || ((v as any).number && (v as any).number.toLowerCase().includes(searchLower));
      }
    }

    return ticketIdMatch || vehicleMatch || driverMatch || localVehicleMatch;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  // Cálculos dinámicos de KPIs
  const totalRecaudadoHoy = tickets.reduce((sum, ticket) => sum + Number(ticket.totalAmount), 0);

  const totalUnidades = vehicles.length || 1;
  const unidadesPagadas = new Set(tickets.map(t => t.vehicleId)).size;
  const porcentajePagadas = Math.round((unidadesPagadas / totalUnidades) * 100);

  const totalPendientes = totalUnidades - unidadesPagadas;
  const tarifaEstimada = 60.50; // Tarifa estándar
  const montoPendiente = totalPendientes * tarifaEstimada;

  // Formateadores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const getPaymentMethodDetails = (method: string) => {
    const safeMethod = (method || 'EFECTIVO').toUpperCase();
    switch (safeMethod) {
      case 'TRANSFERENCIA':
      case 'TRANSFERENCIA_BANCARIA':
        return { label: 'Transferencia', icon: 'account_balance', color: '#0ea5e9' };
      case 'TARJETA':
        return { label: 'Tarjeta', icon: 'credit_card', color: '#8b5cf6' };
      case 'BILLETERA_DIGITAL':
        return { label: 'Billetera Digital', icon: 'smartphone', color: '#ec4899' };
      default:
        return { label: 'Efectivo', icon: 'payments', color: '#10b981' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const safeStatus = (status || 'PENDING').toUpperCase();
    switch (safeStatus) {
      case 'ACTIVE':
        return { background: '#dcfce7', color: '#15803d', label: 'Pagado' };
      case 'VOIDED':
        return { background: '#fee2e2', color: '#b91c1c', label: 'Anulado' };
      default:
        return { background: '#fef3c7', color: '#d97706', label: 'Pendiente' };
    }
  };

  // Lógica para formatear y abrir la impresión de tickets de salida
  const handleOpenPrintTicket = (ticket: DailyTicketDto) => {
    if (ticket.status !== 'ACTIVE') return;

    const vehicleObj = ticket.vehicle || vehicles.find(v => v.id === ticket.vehicleId);
    const matchDriver = drivers.find(d => d.id === ticket.driverId);
    const driverName = matchDriver ? matchDriver.name : (ticket.driver?.name || "No asignado");

    let routeName = "Sin Ruta";
    if (ticket.routeId) {
      const r = routes.find(item => item.id === ticket.routeId);
      if (r) {
        routeName = r.name;
      }
    }

    const firstRound = ticket.rounds?.find(r => r.roundNumber === 1);
    const senseLabel = firstRound?.direction || 'IDA';

    const total = Number(ticket.totalAmount);
    const cuotaAdmin = 3.50;
    const tarifaRuta = total > cuotaAdmin ? total - cuotaAdmin : total;

    const ticketData: PrintTicketData = {
      ticketNumber: `TK-${ticket.id.substring(0, 5).toUpperCase()}`,
      dateTime: new Date(ticket.createdAt).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      vehiclePlate: vehicleObj?.plate || 'S/P',
      vehicleNumber: (vehicleObj as any)?.number || null,
      driverName: driverName,
      routeName: routeName,
      routeDirection: senseLabel,
      items: [
        { label: 'Tarifa de Ruta', value: tarifaRuta },
        { label: 'Cuota Admin', value: total > cuotaAdmin ? cuotaAdmin : 0 }
      ],
      totalAmount: total,
      paymentMethod: ticket.paymentMethod || 'EFECTIVO',
      verificationUrl: (() => {
        const ticketNumber = `TK-${ticket.id.substring(0, 5).toUpperCase()}`;
        const path = `/verify/${ticketNumber}`;
        if (typeof window === 'undefined') return `https://${slug || 'gpscentral'}.centralafbv.com${path}`;
        const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        return isLocal ? `${window.location.origin}${path}` : `https://${slug || 'gpscentral'}.centralafbv.com${path}`;
      })(),
      tenantName: branding?.name || 'Vectura'
    };

    setPrintTicketData(ticketData);
    setIsPrintModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Gestión de Tickets Diarios</h2>
            <p>
              Control administrativo de la flota urbana al {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button className={styles.addBtn} onClick={() => router.push('/payments/new')}>
            <span className="material-symbols-rounded">add_circle</span>
            Registrar Nuevo Pago
          </button>
        </div>

        {/* KPIs Grid */}
        <div className={styles.statsGrid}>
          {/* KPI 1: Recaudado */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
              <span className="material-symbols-rounded">monetization_on</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Total Recaudado Hoy</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{formatCurrency(totalRecaudadoHoy)}</span>
                <span className={styles.statsTrend} style={{ color: '#16a34a' }}>+12.5% vs ayer</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Unidades con pago */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
              <span className="material-symbols-rounded">directions_bus</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Unidades Con Pago</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{porcentajePagadas}%</span>
                <span className={styles.statsTrend}>
                  {unidadesPagadas} de {totalUnidades} u.
                </span>
              </div>
            </div>
          </div>

          {/* KPI 3: Pagos pendientes */}
          <div className={styles.statsCard}>
            <div className={styles.statsIcon} style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
              <span className="material-symbols-rounded">schedule</span>
            </div>
            <div className={styles.statsInfo}>
              <span className={styles.statsLabel}>Pagos Pendientes</span>
              <div className={styles.statsValueRow}>
                <span className={styles.statsValue}>{formatCurrency(montoPendiente)}</span>
                <span className={styles.statsTrend} style={{ color: '#ef4444' }}>
                  {totalPendientes} pend.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className={styles.card}>
          {/* Toolbar */}
          <div className={styles.tableHeader}>
            <h3 className={styles.toolbarTitle}>Detalle de Tickets</h3>
            <div className={styles.tableFilters}>
              <div className={styles.searchWrapper}>
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Buscar tickets, conductores, placas..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <button className={styles.btnAction} onClick={loadData}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>refresh</span>
                Actualizar
              </button>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <div className={styles.emptyState}>
              <span className={`material-symbols-rounded ${styles.emptyIcon}`} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }}>sync</span>
              <p className={styles.emptyTitle}>Cargando información real...</p>
            </div>
          ) : currentTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={`material-symbols-rounded ${styles.emptyIcon}`}>payments</span>
              <h4 className={styles.emptyTitle}>No se encontraron tickets</h4>
              <p className={styles.emptyDesc}>Registra salidas para comenzar a ver el recaudo e iniciar el monitoreo de unidades.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>ID Ticket</th>
                      <th className={styles.th}>Vehículo</th>
                      <th className={styles.th}>Conductor</th>
                      <th className={styles.th}>Ruta</th>
                      <th className={styles.th}>Sentido</th>
                      <th className={styles.th}>Monto Total</th>
                      <th className={styles.th}>Pago</th>
                      <th className={styles.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTickets.map((ticket) => {
                      // Resolver información enriquecida local si el join no viniera completo
                      const vehicleObj = ticket.vehicle || vehicles.find(v => v.id === ticket.vehicleId);
                      const matchDriver = drivers.find(d => d.id === ticket.driverId);
                      const driverName = matchDriver ? matchDriver.name : (ticket.driver?.name || "No asignado");

                      // Obtener ruta asignada
                      let routeName = "Sin Ruta";
                      if (ticket.routeId) {
                        const r = routes.find(item => item.id === ticket.routeId);
                        if (r) {
                          routeName = r.name;
                        }
                      }

                      // Obtener sentido inicial desde daily_rounds
                      const firstRound = ticket.rounds?.find(r => r.roundNumber === 1);
                      const senseLabel = firstRound?.direction || 'IDA';

                      const payMethod = getPaymentMethodDetails(ticket.paymentMethod);
                      const statusStyle = getStatusBadgeStyle(ticket.status);

                      return (
                        <tr key={ticket.id} className={styles.tr}>
                          <td className={styles.td}>
                            <span className={styles.ticketId}>#TK-{ticket.id.substring(0, 5).toUpperCase()}</span>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.vehicleCell}>
                              <div className={styles.vehicleIconWrapper}>
                                <span className="material-symbols-rounded">directions_bus</span>
                              </div>
                              <div>
                                <div className={styles.vehicleName}>Placa: {vehicleObj?.plate || "---"}</div>
                                <small style={{ color: 'var(--outline)', fontSize: '11px' }}>Interno: {(vehicleObj as any)?.number || "---"}</small>
                              </div>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.conductorName}>{driverName}</span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.routeBadge}>{routeName}</span>
                          </td>
                          <td className={styles.td}>
                            <span
                              className={styles.senseBadge}
                              style={{
                                background: senseLabel === 'IDA' ? '#eff6ff' : '#faf5ff',
                                color: senseLabel === 'IDA' ? '#2563eb' : '#7c3aed'
                              }}
                            >
                              {senseLabel}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.amount}>{formatCurrency(Number(ticket.totalAmount))}</span>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.payMethodCell} style={{ color: payMethod.color }}>
                              <span className={`material-symbols-rounded ${styles.payMethodIcon}`} style={{ color: payMethod.color }}>{payMethod.icon}</span>
                              <span>{payMethod.label}</span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <span className={styles.statusBadge} style={{ background: statusStyle.background, color: statusStyle.color, fontWeight: 700 }}>
                                {statusStyle.label}
                              </span>
                              {ticket.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  title="Imprimir Comprobante"
                                  onClick={() => handleOpenPrintTicket(ticket)}
                                  style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#2563eb',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700
                                  }}
                                >
                                  <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>print</span>
                                  Imprimir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (Rediseño Vectura Premium) */}
                <div className={styles.mobileList}>
                  {currentTickets.map((ticket) => {
                    const vehicleObj = ticket.vehicle || vehicles.find(v => v.id === ticket.vehicleId);
                    const matchDriver = drivers.find(d => d.id === ticket.driverId);
                    const driverName = matchDriver ? matchDriver.name : (ticket.driver?.name || "No asignado");

                    let routeName = "Sin Ruta";
                    if (ticket.routeId) {
                      const r = routes.find(item => item.id === ticket.routeId);
                      if (r) {
                        routeName = r.name;
                      }
                    }

                    const statusStyle = getStatusBadgeStyle(ticket.status);

                    return (
                      <div key={ticket.id} className={styles.mobileCard}>
                        <div className={styles.cardHeaderLeft}>
                          <div className={styles.busIconBox}>
                            <span className="material-symbols-rounded">directions_bus</span>
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.mobileVehicleNum}>
                              VEHÍCULO #{(vehicleObj as any)?.number || (vehicleObj?.plate ? vehicleObj.plate.replace('ABC-', '') : '') || "---"}
                            </span>
                            <h4 className={styles.mobileRouteName}>{routeName}</h4>
                            <div className={styles.mobileDriverName}>
                              <span className="material-symbols-rounded">person</span>
                              <span>{driverName}</span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.cardHeaderRight} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <div className={styles.mobileAmount}>{formatCurrency(Number(ticket.totalAmount))}</div>
                          <span
                            className={styles.mobileStatusBadge}
                            style={{ background: statusStyle.background, color: statusStyle.color, fontWeight: 700 }}
                          >
                            {statusStyle.label}
                          </span>
                          {ticket.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleOpenPrintTicket(ticket)}
                              style={{
                                background: 'white',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '9px',
                                fontWeight: 700,
                                marginTop: '2px'
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '10px' }}>print</span>
                              Imprimir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

          {/* Pagination Section */}
          {!loading && filteredTickets.length > itemsPerPage && (
            <div className={styles.footer}>
              <span className={styles.resultsCount}>
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredTickets.length)} de {filteredTickets.length} tickets
              </span>
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.pageBtn} ${currentPage === index + 1 ? styles.pageActive : ''}`}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <span className="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Impresión Universal */}
      <PrintTicketModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticketType="SALIDA"
        ticketData={printTicketData}
      />
    </DashboardLayout>
  );
}
