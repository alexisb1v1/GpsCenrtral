'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Palette } from 'lucide-react';
import { useToast } from '@/app/shared/providers/ToastProvider';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { TenantApiService } from '@/app/features/tenant/services/tenant-api.service';
import { StorageApiService } from '@/app/shared/services/storage-api.service';
import { ImageUploader } from '@/app/shared/components/ImageUploader';
import styles from '../../../AdminForm.module.css';

const tenantApiService = new TenantApiService();
const storageApiService = new StorageApiService();

interface EditTenantPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTenantPage({ params }: EditTenantPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const taxIdRef = useRef<HTMLInputElement>(null);

  const { success: showSuccess, error: showError } = useToast();

  const [formData, setFormData] = useState<{
    name: string;
    subdomain: string;
    address: string;
    phone: string;
    taxId: string;
    logoUrl: string | File | null;
    loginUrl: string | File | null;
    primaryColor: string;
    accentColor: string;
    statusColor: string;
    isActive: boolean;
  }>({
    name: '', subdomain: '', address: '', phone: '', taxId: '', logoUrl: null, loginUrl: null,
    primaryColor: '#004AC6', accentColor: '#2563EB', statusColor: '#10B981', isActive: true
  });


  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const result = await tenantApiService.getById(id);
        if (result.success && result.data) {
          const t = result.data;
          setFormData({
            name: t.name || '', subdomain: t.subdomain || '', address: t.address || '',
            phone: t.phone || '', taxId: t.taxId || '', logoUrl: t.logoUrl || null, loginUrl: t.loginUrl || null,
            primaryColor: t.primaryColor || '#004AC6', accentColor: t.accentColor || '#2563EB',
            statusColor: t.statusDotColor || '#10B981', isActive: t.isActive !== undefined ? t.isActive : true
          });
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchTenant();
  }, [id]);

  const validateRUC = (ruc: string) => /^\d{11}$/.test(ruc);

  const handleSubmit = async () => {
    if (!formData.name || !validateRUC(formData.taxId) || !formData.phone) {
      setShowErrors(true);
      if (!formData.name) nameRef.current?.focus();
      else if (!validateRUC(formData.taxId)) taxIdRef.current?.focus();
      else if (!formData.phone) phoneRef.current?.focus();
      showError('Datos incompletos', 'Por favor verifica los campos obligatorios.');
      return;
    }

    setIsSaving(true);
    try {
      let finalLogoUrl = typeof formData.logoUrl === 'string' ? formData.logoUrl : '';
      let finalLoginUrl = typeof formData.loginUrl === 'string' ? formData.loginUrl : '';

      // Subir Logo si es un archivo nuevo
      if (formData.logoUrl instanceof File) {
        const logoRes = await storageApiService.uploadBrandingImage(formData.logoUrl, formData.taxId, 'logo');
        if (logoRes.success) finalLogoUrl = logoRes.data.url;
      }

      // Subir Login Background si es un archivo nuevo
      if (formData.loginUrl instanceof File) {
        const loginRes = await storageApiService.uploadBrandingImage(formData.loginUrl, formData.taxId, 'login-background');
        if (loginRes.success) finalLoginUrl = loginRes.data.url;
      }

      // Extraemos statusColor para no enviarlo (el backend espera statusDotColor)
      const { statusColor, logoUrl, loginUrl, ...payload } = formData;

      const result = await tenantApiService.update(id, {
        ...payload,
        logoUrl: finalLogoUrl,
        loginUrl: finalLoginUrl,
        statusDotColor: statusColor
      });

      if (result.success) {
        showSuccess('¡Cambios guardados!', 'La configuración se ha actualizado correctamente.');
        setTimeout(() => router.push('/admin/tenants'), 1500);
      } else {
        showError('Error al guardar', result.errorMessage || 'No se pudo completar la operación.');
      }
    } catch (e: any) {
      showError('Error inesperado', 'Ocurrió un problema al procesar la solicitud.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={styles.loadingState}>Cargando configuración...</div>;

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Editar Empresa</h2>
            <p>Define la identidad y los parámetros operativos de la instancia corporativa.</p>
          </div>
          <div className={styles.statusToggle}>
            <div className={styles.statusLabel}>
              <div className={styles.statusDot} style={{ backgroundColor: formData.isActive ? '#2563eb' : '#94a3b8' }}></div>
              Estado Activo
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className="material-symbols-rounded">business_center</span><h3>Información de la Empresa</h3></div>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}><label>Nombre de la empresa</label><input ref={nameRef} type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={showErrors && !formData.name ? styles.inputError : ''} /></div>
              <div className={styles.inputGroup}><label>Subdominio</label><div className={styles.subdomainInput}><input type="text" value={formData.subdomain} disabled style={{ background: '#f1f5f9', color: '#64748b' }} /><span className={styles.domainSuffix}>.centralafbv.com</span></div></div>
              <div className={styles.fullWidth}><div className={styles.inputGroup}><label>Dirección Fiscal</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div></div>
              <div className={styles.inputGroup}><label>Teléfono de contacto</label><input ref={phoneRef} type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={showErrors && !formData.phone ? styles.inputError : ''} /></div>
              <div className={styles.inputGroup}><label>RUC / Tax ID</label><input ref={taxIdRef} type="text" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, '').substring(0, 11) })} className={showErrors && !validateRUC(formData.taxId) ? styles.inputError : ''} /></div>
            </div>
          </div>

          <div className={styles.formSection} style={{ marginBottom: 0 }}>
            <h3 className={styles.sectionTitle}>
              <Palette size={20} />
              Personalización Visual
            </h3>
            <div className={styles.brandingGrid}>
              <div className={styles.uploaderWrapper}>
                <ImageUploader
                  label="Logo Corporativo"
                  value={formData.logoUrl}
                  onChange={(file) => setFormData({ ...formData, logoUrl: file })}
                  aspectRatio="1/1"
                  placeholder="Seleccionar logo"
                />
              </div>
              <div className={styles.uploaderWrapper}>
                <ImageUploader
                  label="Fondo de Login"
                  value={formData.loginUrl}
                  onChange={(file) => setFormData({ ...formData, loginUrl: file })}
                  aspectRatio="16/9"
                  placeholder="Seleccionar imagen de fondo"
                />
              </div>
            </div>

            <div className={styles.visualGrid}>
              <div className={styles.colorCard}>
                <div className={styles.colorInfo}><h4>Color Primario</h4><p>Acciones principales</p></div>
                <div className={styles.colorAction}>
                  <span className={styles.colorValue}>{formData.primaryColor.toUpperCase()}</span>
                  <input type="color" value={formData.primaryColor} onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} className={styles.colorBox} style={{ backgroundColor: formData.primaryColor }} />
                </div>
              </div>

              <div className={styles.colorCard}>
                <div className={styles.colorInfo}><h4>Color Punto de Estado</h4><p>Indicadores de flota</p></div>
                <div className={styles.colorAction}>
                  <span className={styles.colorValue}>{formData.statusColor.toUpperCase()}</span>
                  <input type="color" value={formData.statusColor} onChange={(e) => setFormData({ ...formData, statusColor: e.target.value })} className={styles.colorBox} style={{ backgroundColor: formData.statusColor }} />
                </div>
              </div>

              <div className={styles.colorCard}>
                <div className={styles.colorInfo}><h4>Color de Acento</h4><p>UI Feedback & Highlight</p></div>
                <div className={styles.colorAction}>
                  <span className={styles.colorValue}>{formData.accentColor.toUpperCase()}</span>
                  <input type="color" value={formData.accentColor} onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })} className={styles.colorBox} style={{ backgroundColor: formData.accentColor }} />
                </div>
              </div>

              <div className={styles.previewContainer}>
                <div className={styles.previewSidebar} style={{ backgroundColor: formData.primaryColor }}>
                  <div className={styles.previewLogoCircle}>
                    {formData.logoUrl ? (
                      <img
                        src={typeof formData.logoUrl === 'string' ? formData.logoUrl : URL.createObjectURL(formData.logoUrl)}
                        alt="Logo"
                      />
                    ) : null}
                  </div>
                  <div className={styles.previewNavItems}>
                    <div className={styles.previewNavItem} />
                    <div className={styles.previewNavItem} />
                    <div className={styles.previewNavItem} />
                  </div>
                </div>
                <div className={styles.previewContent}>
                  <div className={styles.previewTopbar} />
                  <div className={styles.previewStats}>
                    <div className={styles.previewStatCard}><div className={styles.previewStatHeader} style={{ backgroundColor: formData.accentColor }} /></div>
                    <div className={styles.previewStatCard}><div className={styles.previewStatHeader} style={{ backgroundColor: formData.accentColor }} /></div>
                  </div>
                  <div className={styles.previewMap}>
                    <div className={styles.previewMarker} style={{ backgroundColor: formData.statusColor }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => router.push('/admin/tenants')}>Cancelar</button>
            <button className={styles.saveBtn} onClick={handleSubmit} disabled={isSaving}>
              <span className="material-symbols-rounded">save</span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
