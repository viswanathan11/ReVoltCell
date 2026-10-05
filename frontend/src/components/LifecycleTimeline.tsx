import React from 'react';
import { LifecycleEvent } from '../types/analysis';
import { Clock } from 'lucide-react';

interface LifecycleTimelineProps {
  events: LifecycleEvent[];
}

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return <div style={{ color: '#64748b' }}>No lifecycle history logged.</div>;
  }

  const getEventBadgeColor = (evt: string) => {
    switch (evt) {
      case 'EV_BATTERY':
        return '#3b82f6';
      case 'RETIRED':
        return '#64748b';
      case 'RECOVERED':
        return '#8b5cf6';
      case 'TESTED':
        return '#10b981';
      case 'SECOND_LIFE_EVALUATION':
        return '#f59e0b';
      case 'SECOND_LIFE_CANDIDATE':
        return '#10b981';
      case 'RECYCLE':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div className="timeline">
      {events.map((e, index) => {
        const color = getEventBadgeColor(e.event);
        const dateStr = new Date(e.timestamp).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={e.id || index} className="timeline-item">
            <div className="timeline-point" style={{ backgroundColor: color }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color,
                  backgroundColor: `${color}15`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: `1px solid ${color}30`,
                }}
              >
                {e.event.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {dateStr}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              {e.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};
