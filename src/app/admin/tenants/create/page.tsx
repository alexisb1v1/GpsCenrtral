'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Palette, Smartphone, Globe, Shield, Activity, Phone, MapPin, Building2, Hash, ExternalLink, ArrowLeft, Loader2, Check } from 'lucide-react';
import DashboardLayout from '@/app/features/dashboard/ui/layout/DashboardLayout';
import { TenantApiService } from '@/app/features/tenant/services/tenant-api.service';
import { StorageApiService } from '@/app/shared/services/storage-api.service';
import { useToast } from '@/app/shared/providers/ToastProvider';
import { ImageUploader } from '@/app/shared/components/ImageUploader';
import styles from '../TenantsForm.module.css';

const tenantApiService = new TenantApiService();
const storageApiService = new StorageApiService();

export default function CreateTenantPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  const nameRef = useRef<HTMLInputElement>(null);
  const subdomainRef = useRef<HTMLInputElement>(null);
  const taxIdRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

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


  const validateRUC = (ruc: string) => /^\d{11}$/.test(ruc);

  const handleSubmit = async () => {
    if (!formData.name || !formData.subdomain || !validateRUC(formData.taxId) || !formData.phone) {
      setShowErrors(true);
      if (!formData.name) nameRef.current?.focus();
      else if (!formData.subdomain) subdomainRef.current?.focus();
      else if (!validateRUC(formData.taxId)) taxIdRef.current?.focus();
      else if (!formData.phone) phoneRef.current?.focus();
      showError('Datos incompletos', 'Por favor verifica los campos obligatorios.');
      return;
    }
    
    setIsSaving(true);
    try {
      let finalLogoUrl = typeof formData.logoUrl === 'string' ? formData.logoUrl : '';
      let finalLoginUrl = typeof formData.loginUrl === 'string' ? formData.loginUrl : '';

      if (formData.logoUrl instanceof File) {
        const logoRes = await storageApiService.uploadBrandingImage(formData.logoUrl, formData.taxId, 'logo');
        if (logoRes.success) finalLogoUrl = logoRes.data.url;
      }

      if (formData.loginUrl instanceof File) {
        const loginRes = await storageApiService.uploadBrandingImage(formData.loginUrl, formData.taxId, 'login-background');
        if (loginRes.success) finalLoginUrl = loginRes.data.url;
      }

      const { statusColor, logoUrl, loginUrl, ...payload } = formData;

      const result = await tenantApiService.create({ 
        ...payload, 
        logoUrl: finalLogoUrl,
        loginUrl: finalLoginUrl,
        statusDotColor: statusColor 
      });

      if (result.success) {
        showSuccess('¡Tenant creado!', 'La empresa ha sido registrada con éxito.');
        setTimeout(() => router.push('/admin/tenants'), 1500);
      } else {
        showError('Validación fallida', result.errorMessage || 'No se pudo completar la operación.');
      }
    } catch (e: any) { 
      showError('Error de red', 'No se pudo conectar con el servidor central.');
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>Configuración del Tenant</h2>
            <p>Define la identidad y los parámetros operativos de la nueva instancia corporativa.</p>
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
              <div className={styles.inputGroup}><label>Nombre de la empresa</label><input ref={nameRef} type="text" placeholder="Ej. Transportes Global S.A." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={showErrors && !formData.name ? styles.inputError : ''} /></div>
              <div className={styles.inputGroup}><label>Subdominio</label><div className={styles.subdomainInput}><input ref={subdomainRef} type="text" placeholder="empresa" value={formData.subdomain} onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })} /><span className={styles.domainSuffix}>.centralafbv.com</span></div></div>
              <div className={styles.fullWidth}><div className={styles.inputGroup}><label>Dirección Fiscal</label><input type="text" placeholder="Calle Industrial 402, Parque Logístico" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div></div>
              <div className={styles.inputGroup}><label>Teléfono de contacto</label><input ref={phoneRef} type="text" placeholder="+54 11 4567 8900" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={showErrors && !formData.phone ? styles.inputError : ''} /></div>
              <div className={styles.inputGroup}><label>RUC / Tax ID</label><input ref={taxIdRef} type="text" placeholder="20-12345678-9" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, '').substring(0, 11) })} className={showErrors && !validateRUC(formData.taxId) ? styles.inputError : ''} /></div>
            </div>
          </div>

          <div className={styles.formSection} style={{ marginBottom: 0 }}>
            <div className={styles.sectionTitle}><span className="material-symbols-rounded">palette</span><h3>Personalización Visual</h3></div>

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

        <div className={styles.infoFooter}>
          <div className={styles.infoCard}><span className={`material-symbols-rounded ${styles.infoIcon}`}>verified_user</span><h4>Aislamiento de Datos</h4><p>Cada tenant opera en una base de datos aislada para máxima seguridad.</p></div>
          <div className={styles.infoCard}><span className={`material-symbols-rounded ${styles.infoIcon}`}>bolt</span><h4>Despliegue Instantáneo</h4><p>Los cambios de personalización se reflejan en tiempo real para los usuarios.</p></div>
          <div className={styles.infoCard}><span className={`material-symbols-rounded ${styles.infoIcon}`}>history</span><h4>Auditoría de Cambios</h4><p>Se guarda un registro histórico de todas las modificaciones de configuración.</p></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
