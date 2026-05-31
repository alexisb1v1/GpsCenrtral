/* d:\Personal\Repositorios\GpsCentral\src\app\verify\[id]\page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_CONFIG } from '@/core/config/api.config';
import styles from './Verify.module.css';

interface VerifyItem {
  label: string;
  value: number;
}

interface VerifyData {
  success: boolean;
  message?: string;
  type?: 'SALIDA' | 'SANCION';
  ticketNumber?: string;
  dateTime?: string;
  vehiclePlate?: string;
  vehicleNumber?: string | null;
  driverName?: string;
  routeName?: string;
  status?: string;
  items?: VerifyItem[];
  totalAmount?: number;
  paymentMethod?: string;
  tenantName?: string;
  primaryColor?: string;
  accentColor?: string;
}

export default function VerifyTicketPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [data, setData] = useState<VerifyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSubdomain = () => {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return '';
    }
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    return '';
  };

  const fetchVerifyData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const subdomain = getSubdomain();
      const url = subdomain 
        ? `${API_CONFIG.BASE_URL}/dashboard/verify/${ticketId}?subdomain=${subdomain}`
        : `${API_CONFIG.BASE_URL}/dashboard/verify/${ticketId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de verificación.');
      }

      const resJson = await response.json();
      setData(resJson);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al validar el ticket.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchVerifyData();
    }
  }, [ticketId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Inyectamos estilos de branding dinámicos si se recuperaron del backend */}
      {data && data.primaryColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary: ${data.primaryColor};
            --accent: ${data.accentColor || data.primaryColor};
          }
        ` }} />
      )}

      {/* Cabecera Pública */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoGroup}>
            <span className="material-symbols-rounded" style={{ fontSize: '28px', color: 'var(--primary, #0052cc)' }}>
              verified_user
            </span>
            <span className={styles.logoText}>Vectura</span>
          </div>
          <span className={styles.headerSubtitle}>Validador Oficial de Recibos</span>
        </div>
      </header>

      <main className={styles.main}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Verificando firma digital en el sistema central...</p>
          </div>
        ) : error ? (
          <div className={`${styles.card} ${styles.errorCard}`}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444' }}>
              error
            </span>
            <h1 className={styles.title} style={{ color: '#ef4444' }}>Fallo de Conexión</h1>
            <p className={styles.description}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchVerifyData}>
              Reintentar Verificación
            </button>
          </div>
        ) : data && !data.success ? (
          <div className={`${styles.card} ${styles.invalidCard}`}>
            <span className="material-symbols-rounded" style={{ fontSize: '56px', color: '#ea580c' }}>
              warning
            </span>
            <h1 className={styles.title} style={{ color: '#ea580c' }}>Documento No Válido</h1>
            <p className={styles.description}>
              {data.message || 'El código escaneado no coincide con ningún registro autorizado en Vectura.'}
            </p>
            <div className={styles.safetyBox}>
              <strong>Advertencia de Seguridad:</strong> Este código QR puede ser fraudulento o haber sido adulterado. Por favor, comuníquese con la administración central de transportes.
            </div>
          </div>
        ) : data ? (
          <div className={styles.card}>
            {/* Cabecera del Estado del Ticket */}
            <div className={styles.statusBanner}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                check_circle
              </span>
              <span>TICKET VERIFICADO Y VÁLIDO</span>
            </div>

            <div className={styles.ticketContent}>
              <div className={styles.ticketMeta}>
                <span className={styles.ticketTypeLabel}>
                  {data.type === 'SALIDA' ? 'DESPACHO DE VEHÍCULO' : 'RECAUDACIÓN DE CAJA'}
                </span>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--primary, #0052cc)', margin: '8px 0 2px 0', letterSpacing: '-0.5px' }}>
                  {data.tenantName || 'Vectura'}
                </h1>
                <h2 className={styles.ticketId} style={{ marginTop: '0', fontSize: '24px' }}>{data.ticketNumber}</h2>
                <p className={styles.dateTimeText}>
                  Validado el {formatDate(data.dateTime || '')}
                </p>
              </div>

              <div className={styles.divider} />

              {/* Grid de Información del Viaje / Pago */}
              <div className={styles.infoGrid}>
                <div className={styles.infoCell}>
                  <span className={styles.cellLabel}>Empresa de Transporte</span>
                  <p className={styles.cellValue}>{data.tenantName}</p>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.cellLabel}>Placa de Autobús</span>
                  <p className={styles.cellValue} style={{ fontWeight: 800, color: 'var(--primary, #0052cc)' }}>
                    {data.vehiclePlate} {data.vehicleNumber ? `[Unidad: ${data.vehicleNumber}]` : ''}
                  </p>
                </div>

                <div className={styles.infoCell}>
                  <span className={styles.cellLabel}>Conductor Asignado</span>
                  <p className={styles.cellValue}>{data.driverName}</p>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.cellLabel}>Concepto Operativo</span>
                  <p className={styles.cellValue}>{data.routeName}</p>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Desglose de Cobro */}
              <div className={styles.breakdown}>
                <h3 className={styles.breakdownTitle}>Detalle de Cobro</h3>
                <div className={styles.itemsList}>
                  {data.items?.map((item, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      <span className={styles.itemLabel}>{item.label}</span>
                      <span className={styles.itemValue}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>MONTO TOTAL PAGADO</span>
                  <span className={styles.totalValue}>{formatCurrency(data.totalAmount || 0)}</span>
                </div>

                <div className={styles.methodBadge}>
                  Método de Pago: <strong>{data.paymentMethod}</strong>
                </div>
              </div>
            </div>

            <footer className={styles.cardFooter}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#16a34a' }}>
                verified
              </span>
              Firma digital válida de Vectura Central Systems.
            </footer>
          </div>
        ) : null}
      </main>
    </div>
  );
}
