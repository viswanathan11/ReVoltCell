import React from 'react';
import { CellStatusBadge } from './CellStatusBadge';

interface ScoreGaugeProps {
  score: number | null | undefined;
  classification?: string | null;
  electricalScore?: number;
  thermalScore?: number;
  stabilityScore?: number;
  voltageSag?: number;
  temperatureRise?: number;
  compact?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  classification,
  electricalScore,
  thermalScore,
  stabilityScore,
  voltageSag,
  temperatureRise,
  compact = false,
}) => {
  if (score === null || score === undefined) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
        No evaluation score recorded yet.
      </div>
    );
  }

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981'; // emerald
    if (s >= 65) return '#f59e0b'; // amber
    if (s >= 45) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const color = getColor(score);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>
          {score} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/100</span>
        </div>
        <CellStatusBadge classification={classification} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Prototype Screening Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: '1rem', color: '#64748b' }}>/ 100</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>Classification</div>
          <CellStatusBadge classification={classification} />
        </div>
      </div>

      {/* Main Score Progress Bar */}
      <div style={{ width: '100%', height: 10, backgroundColor: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 5,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Sub-scores breakdown */}
      {(electricalScore !== undefined || thermalScore !== undefined || stabilityScore !== undefined) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
          {electricalScore !== undefined && (
            <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Electrical</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                {electricalScore} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/40</span>
              </div>
              {voltageSag !== undefined && (
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: 2 }}>Sag: {voltageSag}V</div>
              )}
            </div>
          )}

          {thermalScore !== undefined && (
            <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Thermal</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                {thermalScore} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/30</span>
              </div>
              {temperatureRise !== undefined && (
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: 2 }}>Rise: +{temperatureRise}°C</div>
              )}
            </div>
          )}

          {stabilityScore !== undefined && (
            <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Stability</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                {stabilityScore} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/30</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 2 }}>Curve monotonic</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
