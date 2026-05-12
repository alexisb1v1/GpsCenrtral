import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'success' | 'warning' | 'error';
  icon: LucideIcon;
  subtitle?: string;
  color?: string;
}

export default function StatsCard({ 
  label, 
  value, 
  trend, 
  trendType = 'success', 
  icon: Icon,
  subtitle,
  color = '#2563eb'
}: StatsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconBox} style={{ backgroundColor: `${color}15`, color: color }}>
          <Icon size={24} />
        </div>
        <div className={styles.labelContainer}>
          <span className={styles.label}>{label}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
      </div>
      
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        {trend && (
          <div className={`${styles.trend} ${styles[trendType]}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
