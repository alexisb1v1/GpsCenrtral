'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './BrandingPage.module.css';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { useBranding } from '@/app/shared/providers/BrandingContext';
import { TenantApiService } from '@/app/features/tenant/services/tenant-api.service';
import { StorageApiService } from '@/app/shared/services/storage-api.service';
import { useToast } from '@/app/shared/providers/ToastProvider';
import Cookies from 'js-cookie';

export default function BrandingPage() {
  const { branding, slug } = useBranding();
  const { success: showSuccess, error: showError } = useToast();
  const tenantApi = new TenantApiService();
  const storageApi = new StorageApiService();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);

  // Form State
  const [colors, setColors] = useState({
    primary: '#004ac6',
    accent: '#2563eb',
    status: '#10b981'
  });

  const [images, setImages] = useState({
    logo: null as string | null,
    login: null as string | null
  });

  const [files, setFiles] = useState({
    logo: null as File | null,
    login: null as File | null
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      const sessionStr = Cookies.get('gps_central_session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const tenantId = session.user.tenantId;

      const response = await tenantApi.getById(tenantId);
      if (response.success) {
        const data = response.data;
        setTenantData(data);
        setColors({
          primary: data.primaryColor || '#004ac6',
          accent: data.accentColor || '#2563eb',
          status: data.statusDotColor || '#10b981'
        });
        setImages({
          logo: data.logoUrl,
          login: data.loginUrl
        });
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      showError('Error', 'Error al cargar datos de la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'login') => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!tenantData) return;
    setIsSaving(true);

    try {
      let logoUrl = images.logo;
      let loginUrl = images.login;

      // 1. Upload images if changed
      if (files.logo) {
        const res = await storageApi.uploadBrandingImage(files.logo, tenantData.taxId, 'logo');
        logoUrl = res.data.url;
      }

      if (files.login) {
        const res = await storageApi.uploadBrandingImage(files.login, tenantData.taxId, 'login');
        loginUrl = res.data.url;
      }

      // 2. Update Tenant
      const updateData = {
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        isActive: tenantData.isActive,
        logoUrl,
        loginUrl,
        primaryColor: colors.primary,
        accentColor: colors.accent,
        statusDotColor: colors.status,
        address: tenantData.address,
        phone: tenantData.phone,
        taxId: tenantData.taxId
      };

      const response = await tenantApi.update(tenantData.id, updateData);
      if (response.success) {
        showSuccess('¡Éxito!', 'Personalización actualizada correctamente. Recarga la página para ver los cambios.');
        // Opcional: window.location.reload() o actualizar el contexto
      } else {
        showError('Error', response.errorMessage || 'Error al actualizar');
      }
    } catch (error: any) {
      showError('Error', error.message || 'Error en la operación');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Cargando configuración de branding...</div>;
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={`material-symbols-rounded ${styles.icon}`}>palette</span>
          <h1>Personalización Visual</h1>
        </header>

        <div className={styles.uploadGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Logo Corporativo</h2>
            <div className={styles.uploadBox} onClick={() => logoInputRef.current?.click()}>
              <input 
                type="file" 
                ref={logoInputRef} 
                hidden 
                accept="image/*" 
                onChange={(e) => handleImageChange(e, 'logo')}
              />
              {images.logo ? (
                <img src={images.logo} alt="Logo Preview" className={styles.previewImage} />
              ) : (
                <span className={`material-symbols-rounded ${styles.uploadIcon}`}>image</span>
              )}
              <div className={styles.uploadText}>Seleccionar logo</div>
              <div className={styles.uploadSubtext}>PNG, JPG o WEBP (Auto-optimizado)</div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Fondo de Login</h2>
            <div className={styles.uploadBox} onClick={() => loginInputRef.current?.click()}>
              <input 
                type="file" 
                ref={loginInputRef} 
                hidden 
                accept="image/*" 
                onChange={(e) => handleImageChange(e, 'login')}
              />
              {images.login ? (
                <img src={images.login} alt="Login Preview" className={styles.previewImage} />
              ) : (
                <span className={`material-symbols-rounded ${styles.uploadIcon}`}>image</span>
              )}
              <div className={styles.uploadText}>Seleccionar imagen de fondo</div>
              <div className={styles.uploadSubtext}>PNG, JPG o WEBP (Auto-optimizado)</div>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.colorGrid}>
              <div className={styles.colorItem}>
                <div className={styles.colorInfo}>
                  <h3>Color Primario</h3>
                  <p>Acciones principales</p>
                </div>
                <div className={styles.colorPickerWrapper}>
                  <span className={styles.hexCode}>{colors.primary}</span>
                  <div className={styles.colorCircle} style={{ background: colors.primary }}>
                    <input 
                      type="color" 
                      className={styles.colorInput} 
                      value={colors.primary}
                      onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.colorItem}>
                <div className={styles.colorInfo}>
                  <h3>Color Punto de Estado</h3>
                  <p>Indicadores de flota</p>
                </div>
                <div className={styles.colorPickerWrapper}>
                  <span className={styles.hexCode}>{colors.status}</span>
                  <div className={styles.colorCircle} style={{ background: colors.status }}>
                    <input 
                      type="color" 
                      className={styles.colorInput} 
                      value={colors.status}
                      onChange={(e) => setColors(prev => ({ ...prev, status: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.colorItem} style={{ gridColumn: 'span 2' }}>
                <div className={styles.colorInfo}>
                  <h3>Color de Acento</h3>
                  <p>UI Feedback & Highlight</p>
                </div>
                <div className={styles.colorPickerWrapper}>
                  <span className={styles.hexCode}>{colors.accent}</span>
                  <div className={styles.colorCircle} style={{ background: colors.accent }}>
                    <input 
                      type="color" 
                      className={styles.colorInput} 
                      value={colors.accent}
                      onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.previewCard}>
            <div className={styles.previewSidebar} style={{ background: colors.primary }}>
              <div className={styles.previewSidebarCircle} />
              <div className={styles.previewSidebarCircle} />
              <div className={styles.previewSidebarCircle} />
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewHeader}>
                <div className={styles.previewBar} style={{ background: colors.accent }} />
                <div className={styles.previewBar} style={{ width: '60px', background: colors.accent }} />
              </div>
              <div className={styles.previewMain}>
                <div className={styles.previewDot} style={{ background: colors.status, boxShadow: `0 0 8px ${colors.status}` }} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={() => window.location.reload()}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-rounded">save</span>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
