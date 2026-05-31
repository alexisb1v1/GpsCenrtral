/* d:\Personal\Repositorios\GpsCentral\src\app\shared\components\PrintTicketModal.tsx */
'use client';

import React from 'react';
import styles from './PrintTicketModal.module.css';
import { useToast } from '@/app/shared/providers/ToastProvider';

// Helper de carga dinámica de biblioteca de imagen desde CDN (Cloudflare)
const loadHtmlToImage = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }
    if ((window as any).htmlToImage) {
      resolve((window as any).htmlToImage);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
    script.onload = () => resolve((window as any).htmlToImage);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export interface PrintTicketItem {
  label: string;
  value: number;
}

export interface PrintTicketData {
  ticketNumber: string;
  dateTime: string;
  vehiclePlate: string;
  vehicleNumber?: string | null;
  driverName: string;
  routeName: string;
  routeDirection?: string | null;
  description?: string | null;
  items: PrintTicketItem[];
  totalAmount: number;
  paymentMethod: string;
  verificationUrl?: string;
  tenantName?: string;
}

interface PrintTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketType: 'SALIDA' | 'SANCION';
  ticketData: PrintTicketData | null;
}

export default function PrintTicketModal({
  isOpen,
  onClose,
  ticketType,
  ticketData
}: PrintTicketModalProps) {
  const { success: showSuccess, error: showError } = useToast();

  if (!isOpen || !ticketData) return null;

  // Formateador de moneda en Soles (es-PE)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(val);
  };

  // Función nativa de impresión
  const handlePrint = () => {
    window.print();
  };

  // Función nativa e inteligente de compartir imagen + texto del ticket
  const handleShare = async () => {
    const isSalida = ticketType === 'SALIDA';
    const title = isSalida ? 'Ticket de Salida' : 'Comprobante de Pago';
    
    const node = document.getElementById('print-ticket-wrapper');
    if (!node) {
      showError('Error', 'No se encontró el contenedor del ticket.');
      return;
    }

    // Lista de elementos de hojas de estilo externas deshabilitados temporalmente
    const disabledLinks: HTMLLinkElement[] = [];

    try {
      // Cargar dinámicamente la biblioteca html-to-image de forma segura
      const h2i = await loadHtmlToImage();
      
      // Identificar y deshabilitar hojas de estilo externas temporalmente para evitar error de CORS
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      styleLinks.forEach(link => {
        if (link.href && !link.href.startsWith(window.location.origin)) {
          link.disabled = true;
          disabledLinks.push(link);
        }
      });

      // Convertir el div del ticket a una imagen PNG en base64
      const dataUrl = await h2i.toPng(node, { 
        backgroundColor: '#ffffff',
        fontEmbedCSS: '', // Evitar la inyección/descarga automática de fuentes externas que causa lectura recursiva de cssRules
        width: 400, // Forzar ancho de renderizado a 400px para evitar desfases responsivos
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '400px', // Forzar el ancho del clon
          margin: '0',
          padding: '24px 16px', // 24px de espaciado vertical arriba/abajo y 16px lateral de fondo blanco
          borderRadius: '0',
          boxShadow: 'none',
          border: 'none',
          '--ticket-bg-clip': '#ffffff' // Ajustar variable de calado circular al fondo blanco
        } as any,
        styleSheetsFilter: (styleSheet: CSSStyleSheet) => {
          try {
            // Intentar leer las reglas. Si no arroja SecurityError por CORS, se incluye.
            const rules = styleSheet.cssRules;
            return true;
          } catch (e) {
            // Excluir hojas de estilo con restricciones CORS externas que causan error
            return false;
          }
        }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${ticketData.ticketNumber.toLowerCase()}.png`, { type: 'image/png' });

      // Compartir nativo (móviles)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Vectura - ${ticketData.ticketNumber}`,
          text: `🎫 Aquí tienes tu ${title} #${ticketData.ticketNumber} de Vectura.`,
        });
        showSuccess('Comprobante compartido', 'Se abrió la bandeja de compartido del dispositivo.');
      } else {
        // Descarga automática en computadoras de escritorio
        const link = document.createElement('a');
        link.download = `${ticketData.ticketNumber.toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();

        const itemsText = ticketData.items
          .map(item => `- ${item.label}: ${formatCurrency(item.value)}`)
          .join('\n');
        
        const textMessage = `🎫 *Vectura Urban Transport System* 🎫\n*${title.toUpperCase()}*\n\n` +
          `*Nro Ticket:* ${ticketData.ticketNumber}\n` +
          `*Fecha/Hora:* ${ticketData.dateTime}\n` +
          `*Vehículo:* ${ticketData.vehiclePlate}${ticketData.vehicleNumber ? ` (Nro Int: ${ticketData.vehicleNumber})` : ''}\n` +
          `*Conductor:* ${ticketData.driverName}\n` +
          `*Ruta:* ${ticketData.routeName}\n\n` +
          `*Conceptos:*\n${itemsText}\n\n` +
          `*TOTAL:* ${formatCurrency(ticketData.totalAmount)} (${ticketData.paymentMethod})`;
          
        await navigator.clipboard.writeText(textMessage);
        showSuccess('Ticket Descargado', 'El comprobante se descargó como imagen PNG y el resumen se copió al portapapeles.');
      }
    } catch (err: any) {
      console.error('Error al generar o compartir la imagen del ticket:', err);
      showError('Error al compartir', 'No se pudo generar el archivo de imagen del ticket.');
    } finally {
      // Restaurar las hojas de estilo externas inmediatamente
      disabledLinks.forEach(link => {
        link.disabled = false;
      });
    }
  };

  // Generación dinámica del QR de QR Server (API sumamente estable y sin problemas de CSP/CORS)
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://gpscentral.afbv.com';
  const encodedUrl = encodeURIComponent(ticketData.verificationUrl || `${host}/verify/${ticketData.ticketNumber}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Barra de Acciones Superior */}
        <div className={styles.actionsBar}>
          <button type="button" className={styles.printBtn} onClick={handlePrint}>
            <span className="material-symbols-rounded">print</span>
            Imprimir Comprobante
          </button>
          <button type="button" className={styles.shareBtn} onClick={handleShare}>
            <span className="material-symbols-rounded">share</span>
            Compartir
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Cuerpo del Modal con el Ticket */}
        <div className={styles.scrollableArea}>
          <div id="print-ticket-wrapper" className={styles.ticketWrapperForPrint}>
            <div id="print-ticket-content" className={styles.ticket}>
            {/* Encabezado */}
            <div className={styles.ticketHeader}>
              <h1 className={styles.ticketLogo}>{ticketData.tenantName || 'Vectura'}</h1>
              <p className={styles.ticketTitle}>
                {ticketType === 'SALIDA' ? 'Ticket de Salida' : 'Comprobante de Pago'}
              </p>
            </div>

            {/* Contenido */}
            <div className={styles.ticketBody}>
              {/* Grid de Información Principal */}
              <div className={styles.infoGrid}>
                <div>
                  <span className={styles.infoLabel}>Ticket No.</span>
                  <p className={`${styles.infoValue} ${styles.infoValueHighlight}`}>
                    {ticketData.ticketNumber}
                  </p>
                </div>
                <div>
                  <span className={styles.infoLabel}>Fecha / Hora</span>
                  <p className={styles.infoValue}>{ticketData.dateTime}</p>
                </div>

                <div>
                  <span className={styles.infoLabel}>Vehículo ID</span>
                  <p className={styles.infoValue}>
                    {ticketData.vehiclePlate} {ticketData.vehicleNumber ? `[${ticketData.vehicleNumber}]` : ''}
                  </p>
                </div>
                <div>
                  <span className={styles.infoLabel}>Conductor</span>
                  <p className={styles.infoValue}>{ticketData.driverName}</p>
                </div>

                <div className={styles.fullWidthRow}>
                  <span className={styles.infoLabel}>Ruta</span>
                  <p className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                      <path d="M9 3v18" />
                      <path d="M15 6v15" />
                    </svg>
                    {ticketData.routeName}
                  </p>
                </div>

                <div className={styles.fullWidthRow}>
                  <span className={styles.infoLabel}>
                    {ticketType === 'SALIDA' ? 'Sentido de Marcha' : 'Detalle / Concepto'}
                  </span>
                  <p className={styles.infoValue}>
                    {ticketType === 'SALIDA'
                      ? (ticketData.routeDirection || 'IDA')
                      : (ticketData.description || 'Regularización de multas operativas')}
                  </p>
                </div>
              </div>

              {/* Desglose de Tarifas */}
              <div className={styles.breakdownList}>
                {ticketData.items.map((item, idx) => (
                  <div key={idx} className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>{item.label}</span>
                    <span className={styles.breakdownValue}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>

              {/* Fila del Total General */}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>TOTAL</span>
                <span className={styles.totalValue}>{formatCurrency(ticketData.totalAmount)}</span>
              </div>

              {/* Código QR de Verificación */}
              <div className={styles.verificationSection}>
                <div className={styles.qrContainer}>
                  <img
                    src={qrUrl}
                    alt="Verificación QR"
                    className={styles.qrImage}
                    loading="lazy"
                  />
                </div>
                <p className={styles.footerText}>
                  Escanee para verificar autenticidad en portal Vectura Urban Transport System © {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
