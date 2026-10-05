import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TestMeasurement } from '../types/test';

interface TestChartProps {
  measurements: TestMeasurement[];
  height?: number;
}

export const TestChart: React.FC<TestChartProps> = ({ measurements, height = 320 }) => {
  const [activeMetric, setActiveMetric] = useState<'all' | 'voltage' | 'current' | 'temperature'>('all');

  if (!measurements || measurements.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        No measurement records available.
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', padding: '10px 14px', borderRadius: 6, fontSize: '0.8rem' }}>
          <div style={{ color: '#94a3b8', marginBottom: 4 }}>Elapsed: {label}s</div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} style={{ color: entry.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 600 }}>
                {entry.value} {entry.name.includes('Voltage') ? 'V' : entry.name.includes('Current') ? 'A' : '°C'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12 }}>
        <button
          className={`btn btn-sm ${activeMetric === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveMetric('all')}
        >
          All Metrics
        </button>
        <button
          className={`btn btn-sm ${activeMetric === 'voltage' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveMetric('voltage')}
        >
          Voltage (V)
        </button>
        <button
          className={`btn btn-sm ${activeMetric === 'current' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveMetric('current')}
        >
          Current (A)
        </button>
        <button
          className={`btn btn-sm ${activeMetric === 'temperature' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveMetric('temperature')}
        >
          Temp (°C)
        </button>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={measurements} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
            <XAxis dataKey="elapsedSeconds" stroke="#64748b" tick={{ fontSize: 11 }} unit="s" />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

            {(activeMetric === 'all' || activeMetric === 'voltage') && (
              <Line
                type="monotone"
                dataKey="voltage"
                name="Voltage (V)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            )}

            {(activeMetric === 'all' || activeMetric === 'current') && (
              <Line
                type="monotone"
                dataKey="current"
                name="Current (A)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            )}

            {(activeMetric === 'all' || activeMetric === 'temperature') && (
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
