'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import styles from './ImageUploader.module.css';
import { optimizeImage } from '@/app/shared/utils/image-optimizer';
import { getBrandingImageUrl } from '@/app/shared/utils/image-url';

interface ImageUploaderProps {
  label: string;
  value: string | File | null;
  onChange: (file: File | null) => void;
  aspectRatio?: string;
  placeholder?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  value, 
  onChange, 
  aspectRatio = '1/1',
  placeholder = 'Subir imagen',
  maxWidth,
  maxHeight
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Efecto para manejar la previsualización dependiendo de si el valor es una URL o un archivo
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    if (typeof value === 'string') {
      setPreviewUrl(getBrandingImageUrl(value) || null);
    } else if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      
      // Limpieza de la URL del objeto para evitar fugas de memoria
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones básicas
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      // Optimizamos la imagen antes de pasarla al padre
      const optimizedFile = await optimizeImage(file, {
        maxWidth: maxWidth || (label.toLowerCase().includes('logo') ? 800 : 1920),
        maxHeight: maxHeight || (label.toLowerCase().includes('logo') ? 800 : 1080),
        quality: 0.8
      });

      onChange(optimizedFile);
    } catch (err: any) {
      console.error('Error al optimizar imagen:', err);
      setError('No se pudo procesar la imagen');
    } finally {
      setIsOptimizing(false);
    }
  };

  const removeImage = () => {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      
      <div 
        className={`${styles.uploadBox} ${previewUrl ? styles.hasImage : ''} ${isOptimizing ? styles.uploading : ''}`}
        style={{ aspectRatio }}
        onClick={() => !isOptimizing && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <div className={styles.previewContainer}>
            <img src={previewUrl} alt="Preview" className={styles.previewImage} />
            <div className={styles.overlay}>
              <Upload size={24} />
              <span>Cambiar imagen</span>
            </div>
            <button 
              className={styles.removeBtn} 
              onClick={(e) => { e.stopPropagation(); removeImage(); }}
              title="Eliminar imagen"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {isOptimizing ? (
              <Loader2 className={styles.spinner} size={32} />
            ) : (
              <>
                <div className={styles.iconBox}>
                  <ImageIcon size={32} />
                </div>
                <div className={styles.text}>
                  <span className={styles.mainText}>{placeholder}</span>
                  <span className={styles.subText}>PNG, JPG o WEBP (Auto-optimizado)</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />
      
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
