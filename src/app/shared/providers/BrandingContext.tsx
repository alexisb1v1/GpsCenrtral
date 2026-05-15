'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { TenantBranding } from '@/app/features/tenant/models/tenant.model';

interface BrandingContextType {
  branding: TenantBranding | null;
  slug: string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingClientProvider({ 
  children, 
  branding, 
  slug 
}: { 
  children: ReactNode; 
  branding: TenantBranding | null;
  slug: string;
}) {
  console.log('[BrandingContext] Recibido branding:', branding);
  return (
    <BrandingContext.Provider value={{ branding, slug }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding debe usarse dentro de un BrandingProvider');
  }
  return context;
}
