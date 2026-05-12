import { getTenantBrandingUseCase } from "./features/tenant";
import { getTenantSlug } from "@/shared/utils/tenant.utils";
import { LogOut, Truck, MapPin, BarChart3 } from "lucide-react";
import { headers } from "next/headers";

export default async function HomePage() {
  // Detección automática del slug desde el subdominio
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = await getTenantSlug(host || undefined);
  
  const result = await getTenantBrandingUseCase.execute(slug);
  const branding = result.isOk() ? result.value : null;

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header con Branding Dinámico */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '3rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {branding?.name || 'GpsCentral'}
          </h1>
          <p style={{ color: 'var(--slate-500)' }}>Panel de Monitoreo: {slug}</p>
        </div>
        <button className="glass" style={{ 
          padding: '0.75rem 1.5rem', 
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--foreground)'
        }}>
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </header>

      {/* ... Resto del contenido ... */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        <div className="card">
          <Truck style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h3>Vehículos Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>42 / 50</p>
          <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>● En línea</span>
        </div>

        <div className="card">
          <MapPin style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h3>Alertas Geocerca</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>12</p>
          <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>Requiere atención</span>
        </div>

        <div className="card">
          <BarChart3 style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h3>Consumo Combustible</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>340L</p>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Promedio diario</p>
        </div>
      </div>

      <section className="glass" style={{ 
        padding: '3rem', 
        borderRadius: 'var(--radius)',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 99, 102, 241), 0.1), rgba(var(--success-rgb, 16, 185, 129), 0.1))'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Bienvenido al Centro de Control</h2>
        <p style={{ color: 'var(--slate-600)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Selecciona una unidad en el mapa para ver su telemetría detallada para <strong>{branding?.name}</strong>.
        </p>
        <button style={{ 
          backgroundColor: 'var(--primary)', 
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: 'var(--radius)',
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          Ver Mapa de Flota
        </button>
      </section>
    </main>
  );
}
