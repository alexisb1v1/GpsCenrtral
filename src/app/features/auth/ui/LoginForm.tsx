'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoginForm.module.css';
import { Mail, Lock, Eye, EyeOff, LogIn, BusFront, Loader2 } from 'lucide-react';
import { loginUseCase } from '../index';
import { getTenantBrandingUseCase } from '../../tenant/index';
import { getTenantSlugClient } from '@/shared/utils/tenant.utils';
import { TenantBranding } from '../../tenant/models/tenant.model';
import { getBrandingImageUrl } from '@/app/shared/utils/image-url';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      const slug = getTenantSlugClient();
      const result = await getTenantBrandingUseCase.execute(slug);
      result.match(
        (data) => setBranding(data),
        () => console.log('Usando branding por defecto')
      );
    };
    fetchBranding();
  }, []);

  // Inyectar variables CSS dinámicamente en el cliente para asegurar que el tema se aplique
  useEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--primary', branding.colors.primary);
      document.documentElement.style.setProperty('--accent', branding.colors.accent);
      document.documentElement.style.setProperty('--success', branding.colors.status);
    }
  }, [branding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const tenantSlug = getTenantSlugClient();

    const result = await loginUseCase.execute({
      email,
      password,
      tenant: tenantSlug
    });

    result.match(
      (session) => {
        // Éxito: Redirigir al dashboard de forma limpia
        console.log('Login exitoso:', session.user.name);
        setIsLoading(false);
        // Usamos location.href para asegurar que el middleware de Next.js 
        // capture la nueva cookie en la primera petición del dashboard
        window.location.href = '/dashboard';
      },
      (err) => {
        // Error: Mostrar mensaje al usuario
        setError(err.message);
        setIsLoading(false);
      }
    );
  };

  return (
    <main className={styles.main}>
      {/* Background Section */}
      <div className={styles.backgroundArea}>
        <img 
          className={styles.bgImage} 
          style={{ opacity: 0.8 }}
          src={getBrandingImageUrl(branding?.loginBackground) || "/imagelogin.png"} 
          alt={`${branding?.name || 'Vectura'} Background`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/imagelogin.png";
          }}
        />
        <div className={styles.overlay}></div>
        
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Control total sobre la movilidad urbana.</h1>
          <p className={styles.heroSubtitle}>
            Gestión inteligente de flotas y frecuencias para ciudades conectadas.
          </p>
        </div>
      </div>

      {/* Login Interaction Section */}
      <div className={styles.formSection}>
        <div className={styles.mobileContent}>
          
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              {branding?.logo && !logoError ? (
                <img 
                  src={getBrandingImageUrl(branding.logo)} 
                  alt={branding.name} 
                  style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <BusFront size={48} strokeWidth={1.5} />
              )}
            </div>
            <span className={styles.brandName} style={{ color: 'var(--primary)' }}>
              {branding?.name || 'Vectura'}
            </span>
          </div>

          <div className={styles.glassCard}>
            <h2 className={styles.formTitle}>Bienvenido</h2>
            <p className={styles.formSubtitle}>Inicie sesión para acceder a su panel de control.</p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.label}>CORREO ELECTRÓNICO</label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.icon} size={20} />
                  <input 
                    type="email" 
                    placeholder="usuario@vectura.com" 
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className={styles.label} style={{ marginBottom: 0 }}>CONTRASEÑA</label>
                  <a href="#" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.icon} size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#64748b', fontSize: '14px' }}>
                  <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  Recordar dispositivo
                </label>
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn} 
                disabled={isLoading}
                style={{ 
                  backgroundColor: 'var(--primary)',
                  color: (branding?.colors.primary === '#EBCB00' || branding?.colors.primary.toLowerCase() === '#ebcb00') ? '#000000' : '#ffffff'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Iniciando...
                  </>
                ) : (
                  <>
                    Entrar
                    <LogIn size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
