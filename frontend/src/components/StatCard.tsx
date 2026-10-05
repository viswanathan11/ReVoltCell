import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon, color = '#10b981' }) => {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
            {value}
          </div>
          {subtext && (
            <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: 4 }}>
              {subtext}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
