'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import styles from '../components/ConfirmModal.module.css';

type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        options: {
          ...options,
          confirmText: options.confirmText || 'Confirmar',
          cancelText: options.cancelText || 'Cancelar',
          type: options.type || 'info',
        },
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  };

  const handleCancel = () => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  };

  const getIcon = (type: ConfirmType) => {
    switch (type) {
      case 'danger': return <AlertCircle size={32} />;
      case 'warning': return <AlertTriangle size={32} />;
      case 'info': return <Info size={32} />;
      default: return <HelpCircle size={32} />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state?.isOpen && (
        <div className={styles.overlay} onClick={handleCancel}>
          <div 
            className={`${styles.modal} ${styles[state.options.type || 'info']}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                {getIcon(state.options.type || 'info')}
              </div>
              <h3 className={styles.title}>{state.options.title}</h3>
              <p className={styles.message}>{state.options.message}</p>
            </div>
            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.cancelBtn}`} onClick={handleCancel}>
                {state.options.cancelText}
              </button>
              <button className={`${styles.btn} ${styles.confirmBtn}`} onClick={handleConfirm}>
                {state.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
