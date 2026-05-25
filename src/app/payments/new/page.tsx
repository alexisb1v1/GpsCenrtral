'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { PaymentApiService, CreateDailyTicketDto } from '@/app/features/payments/services/payment-api.service';
import { VehicleApiService } from '@/app/features/vehicle/services/vehicle-api.service';
import { DriverApiService } from '@/app/features/driver/services/driver-api.service';
import { RouteApiService } from '@/app/features/route/services/route-api.service';
import { VehicleDto } from '@/app/features/vehicle/dto/vehicle.dto';
import { DriverDto } from '@/app/features/driver/dto/driver.dto';
import { RouteDto } from '@/app/features/route/dto/route.dto';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import styles from './page.module.css';

const paymentApi = new PaymentApiService();
const vehicleApi = new VehicleApiService();
const driverApi = new DriverApiService();
const routeApi = new RouteApiService();

export default function NewPaymentPage() {
  const router = useRouter();
  
  // Datos maestros de combos
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [drivers, setDrivers] = useState<DriverDto[]>([]);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  
  // Estado de carga inicial y carga de envío
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [tenantConfigError, setTenantConfigError] = useState(false);

  // Estados del Formulario
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [direction, setDirection] = useState<'IDA' | 'VUELTA'>('IDA');
  
  // Tarifas (valores por defecto sugeridos)
  const [adminFee, setAdminFee] = useState<number>(20.00);
  const [routeFee, setRouteFee] = useState<number>(40.50);
  const [totalAmount, setTotalAmount] = useState<number>(60.50);

  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'BILLETERA_DIGITAL'>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');

  // Cargar datos maestros al montar el componente
  useEffect(() => {
    async function loadMasterData() {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        let sessionTenantId: string | undefined = undefined;
        const sessionStr = Cookies.get('gps_central_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            sessionTenantId = session.user?.tenantId;
          } catch (e) {
            console.error('Error parsing session cookie in new payment page', e);
          }
        }

        if (!sessionTenantId) {
          setTenantConfigError(true);
          setLoadingData(false);
          return;
        }

        const [vehiclesRes, driversRes, routesRes] = await Promise.all([
          vehicleApi.getAll(sessionTenantId),
          driverApi.getAll(sessionTenantId),
          routeApi.getList(sessionTenantId)
        ]);

        if (vehiclesRes.success && vehiclesRes.data) {
          // Filtrar vehículos operativos para una mejor experiencia de despacho
          setVehicles(vehiclesRes.data);
        } else {
          console.error('Error al cargar vehículos:', vehiclesRes.errorMessage);
        }

        if (driversRes.success && driversRes.data) {
          setDrivers(driversRes.data);
        } else {
          console.error('Error al cargar conductores:', driversRes.errorMessage);
        }

        if (routesRes.success && routesRes.data) {
          setRoutes(routesRes.data);
        } else {
          console.error('Error al cargar rutas:', routesRes.errorMessage);
        }
      } catch (error) {
        console.error('Error cargando los combos dinámicos:', error);
        setErrorMessage('Ocurrió un error al cargar la información maestra del servidor. Por favor, intente de nuevo.');
      } finally {
        setLoadingData(false);
      }
    }

    loadMasterData();
  }, []);

  // Recalcular total de manera reactiva en caliente
  useEffect(() => {
    const total = Number(adminFee || 0) + Number(routeFee || 0);
    setTotalAmount(Number(total.toFixed(2)));
  }, [adminFee, routeFee]);

  // Manejar el cambio del selector de métodos de pago
  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as any;
    setPaymentMethod(method);
    // Limpiar referencia si es efectivo
    if (method === 'EFECTIVO') {
      setPaymentReference('');
    }
  };

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones de negocio
    if (!selectedVehicleId) {
      setErrorMessage('Debe seleccionar un vehículo para registrar la salida.');
      return;
    }
    if (!selectedDriverId) {
      setErrorMessage('Debe asignar un conductor a este servicio diario.');
      return;
    }
    if (!selectedRouteId) {
      setErrorMessage('Debe seleccionar una ruta de despacho.');
      return;
    }
    if (adminFee < 0 || routeFee < 0) {
      setErrorMessage('Las tarifas y cuotas no pueden ser importes negativos.');
      return;
    }
    if (paymentMethod !== 'EFECTIVO' && !paymentReference.trim()) {
      setErrorMessage(`Para pagos con ${paymentMethod.replace('_', ' ')} es obligatorio ingresar el número de operación o referencia bancaria.`);
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateDailyTicketDto = {
        vehicleId: selectedVehicleId,
        driverId: selectedDriverId,
        routeId: selectedRouteId,
        adminFee: Number(adminFee),
        routeFee: Number(routeFee),
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        paymentReference: paymentMethod === 'EFECTIVO' ? undefined : paymentReference.trim(),
        direction: direction
      };

      const result = await paymentApi.createTicket(payload);

      if (result.success) {
        setShowToast(true);
        // Redireccionar al listado de control diario después de un breve delay para mostrar el Toast
        setTimeout(() => {
          router.push('/payments');
          router.refresh();
        }, 1800);
      } else {
        setErrorMessage(result.errorMessage || 'Error en el servidor al procesar el ticket de salida.');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error al registrar ticket:', error);
      setErrorMessage('Hubo una falla de comunicación con la API. Verifique su conexión.');
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '56px', color: 'var(--primary)', animation: 'spin 1.2s linear infinite' }}>sync</span>
          <p style={{ fontStyle: 'italic', color: 'var(--on-surface-variant)' }}>Cargando vehículos, conductores y rutas operativas...</p>
        </div>
      </div>
    );
  }

  if (tenantConfigError) {
    return (
      <DashboardLayout>
        <div className={styles.lockContainer}>
          <div className={styles.lockCard}>
            <div className={styles.lockIconWrapper}>
              <span className={`material-symbols-rounded ${styles.lockIcon}`}>domain_disabled</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 className={styles.lockTitle}>
                Falta de Configuración de Empresa
              </h2>
              <p className={styles.lockDesc}>
                Su cuenta de usuario no se encuentra vinculada formalmente a ninguna empresa de transporte (Tenant). 
                Para registrar cobros y tickets de salida diarios, debe iniciar sesión con una cuenta de Cobrador o Administrador asociada a un Tenant operativo.
              </p>
            </div>

            <div className={styles.lockDivider} />

            <Link href="/payments" className={styles.lockBtn}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
              Volver a Gestión de Tickets
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header & Backlink */}
        <div className={styles.headerSection}>
          <Link href="/payments" className={styles.backLink}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
            Volver a Gestión de Tickets
          </Link>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Registro de Ticket Diario</h1>
            <p className={styles.subtitle}>
              Complete los detalles de la unidad y el pago para generar el ticket administrativo.
            </p>
          </div>
        </div>

        {/* Banner Informativo superior si existe algún error */}
        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '16px',
            color: '#991b1b',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          
          {/* Card 1: Información de la Unidad */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`material-symbols-rounded ${styles.cardIcon}`}>directions_bus</span>
              <h2 className={styles.cardTitle}>Información de la Unidad</h2>
            </div>

            {/* Vehículo */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="vehicleSelect">SELECCIÓN DE VEHÍCULO</label>
              <select
                id="vehicleSelect"
                className={styles.select}
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
              >
                <option value="">Seleccione una unidad...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    Placa: {v.plate} ({v.status === 'OPERATIVO' ? 'Operativo' : v.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Conductor */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="driverSelect">SELECCIÓN DE CONDUCTOR</label>
              <select
                id="driverSelect"
                className={styles.select}
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
              >
                <option value="">Seleccione un conductor...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.driverInfo?.licenseNumber ? `Lic: ${d.driverInfo.licenseNumber}` : 'Activo'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card 2: Detalles de la Ruta */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`material-symbols-rounded ${styles.cardIcon}`}>map</span>
              <h2 className={styles.cardTitle}>Detalles de la Ruta</h2>
            </div>

            {/* Ruta */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="routeSelect">RUTA ASIGNADA</label>
              <select
                id="routeSelect"
                className={styles.select}
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                required
              >
                <option value="">Seleccione una ruta...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dirección Inicial (IDA / VUELTA) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>DIRECCIÓN DEL VIAJE</label>
              <div className={styles.toggleContainer}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${direction === 'IDA' ? styles.toggleActive : ''}`}
                  onClick={() => setDirection('IDA')}
                >
                  Ida
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${direction === 'VUELTA' ? styles.toggleActive : ''}`}
                  onClick={() => setDirection('VUELTA')}
                >
                  Vuelta
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Montos de Pago */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`material-symbols-rounded ${styles.cardIcon}`}>payments</span>
              <h2 className={styles.cardTitle}>Montos de Pago</h2>
            </div>

            {/* Cuota Administrativa */}
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Tasa Administrativa</span>
              <div className={styles.priceInputWrapper}>
                <span className={styles.currencyPrefix}>S/</span>
                <input
                  id="adminFeeInput"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${styles.input} ${styles.priceInput}`}
                  value={adminFee}
                  onChange={(e) => setAdminFee(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Cuota de Ruta */}
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Tarifa de Ruta</span>
              <div className={styles.priceInputWrapper}>
                <span className={styles.currencyPrefix}>S/</span>
                <input
                  id="routeFeeInput"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${styles.input} ${styles.priceInput}`}
                  value={routeFee}
                  onChange={(e) => setRouteFee(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Divider */}
            <div className={styles.totalDivider} />

            {/* Total Reactivo */}
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total a Pagar</span>
              <span className={styles.totalValue}>S/ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 4: Información de Pago */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`material-symbols-rounded ${styles.cardIcon}`}>receipt_long</span>
              <h2 className={styles.cardTitle}>Información de Pago</h2>
            </div>

            {/* Método de Pago */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="paymentMethodSelect">MÉTODO DE PAGO</label>
              <select
                id="paymentMethodSelect"
                className={styles.select}
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                required
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
                <option value="TARJETA">TARJETA DE CRÉDITO/DÉBITO</option>
                <option value="BILLETERA_DIGITAL">BILLETERA DIGITAL (YAPE/PLIN)</option>
              </select>
            </div>

            {/* Referencia o Comprobante */}
            {paymentMethod !== 'EFECTIVO' && (
              <div className={styles.formGroup} style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <label className={styles.label} htmlFor="referenceInput">
                  REFERENCIA / COMPROBANTE
                </label>
                <input
                  id="referenceInput"
                  type="text"
                  placeholder="Ej: REF-99201-B"
                  className={styles.input}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

        </form>

        {/* Acciones del formulario */}
        <div className={styles.actionsBar}>
          <Link href="/payments" className={styles.btnCancel}>
            Cancelar
          </Link>
          <button
            type="button"
            className={styles.btnSubmit}
            disabled={submitting || !selectedVehicleId || !selectedDriverId || !selectedRouteId}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <span className="material-symbols-rounded" style={{ animation: 'spin 1.2s linear infinite' }}>sync</span>
                Confirmando Pago...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">check_circle</span>
                Confirmar Pago
              </>
            )}
          </button>
        </div>

        {/* Toast Flotante de Éxito */}
        {showToast && (
          <div className={styles.toast}>
            <span className={`material-symbols-rounded ${styles.toastIcon}`}>check_circle</span>
            <span className={styles.toastText}>¡Salida autorizada y ticket creado exitosamente!</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
