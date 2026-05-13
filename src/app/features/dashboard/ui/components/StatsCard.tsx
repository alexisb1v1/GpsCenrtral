import React from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'success' | 'warning' | 'error';
  iconName: string;
  subtitle?: string;
  color?: string;
  variant?: 'default' | 'principal';
}

export default function StatsCard({ 
  label, 
  value, 
  trend, 
  trendType = 'success', 
  iconName,
  subtitle,
  color = '#2563eb',
  variant = 'default'
}: StatsCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        <div className={styles.iconBox} style={{ backgroundColor: `${color}15`, color: color }}>
          <span className="material-symbols-rounded" style={{ fontSize: variant === 'principal' ? '20px' : '24px' }}>
            {iconName}
          </span>
        </div>
        <div className={styles.labelContainer}>
          <span className={styles.label}>{label}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        
        {variant === 'principal' && trend && (
          <div className={`${styles.trend} ${styles[trendType]}`}>
            {trend}
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        {variant === 'default' && trend && (
          <div className={`${styles.trend} ${styles[trendType]}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
