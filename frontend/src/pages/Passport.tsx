import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { passportApi } from '../api/passportApi';
import { BatteryPassportData } from '../types/analysis';
import { CellStatusBadge } from '../components/CellStatusBadge';
import { QRCodeCard } from '../components/QRCodeCard';
import { LifecycleTimeline } from '../components/LifecycleTimeline';

export const Passport: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [passport, setPassport] = useState<BatteryPassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cellId) return;
    const fetchPassport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await passportApi.getByCellId(cellId);
        setPassport(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve digital battery passport');
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, [cellId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Compiling digital battery passport...</div>;
  }

  if (error || !passport) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Passport data unavailable.'}</div>
        <Link to="/cells" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Inventory</span>
        </Link>
      </div>
    );
  }

  const { cell, latestTest, latestAnalysis, potentialApplications, lifecycle } = passport;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Action Bar (hidden on print) */}
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}
      >
        <Link to={`/cells/${cell.cellId}`} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          <span>Cell Profile</span>
        </Link>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      {/* Main Passport Document Container */}
      <div
        className="card"
        style={{
          border: '2px solid #334155',
          borderRadius: 12,
          padding: 32,
          backgroundColor: '#0f172a',
          position: 'relative',
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: 20, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={28} color="#10b981" />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                REVOLTCELL DIGITAL BATTERY PASSPORT
              </h1>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.825rem', marginTop: 4 }}>
              Circular Economy & Second-Life Triage Verification Protocol
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Passport UID</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>{cell.cellId}</div>
          </div>
        </div>

        {/* Certificate Overview Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Left Column: Cell Specs & Latest Test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity & Specs Box */}
            <div style={{ backgroundColor: '#1e293b', padding: 18, borderRadius: 8 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
                Cell Identity & Native Specifications
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Form Factor: </span>
                  <strong style={{ color: '#38bdf8' }}>{cell.cellType || '18650'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Manufacturer: </span>
                  <strong style={{ color: '#f1f5f9' }}>{cell.manufacturer}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Model: </span>
                  <strong style={{ color: '#f1f5f9' }}>{cell.model}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Chemistry: </span>
                  <strong style={{ color: '#f1f5f9' }}>{cell.chemistry}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Nominal Rating: </span>
                  <strong style={{ color: '#10b981' }}>{cell.nominalVoltage} V</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Rated Capacity: </span>
                  <strong style={{ color: '#60a5fa' }}>{cell.ratedCapacityMah} mAh</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Provenance: </span>
                  <strong style={{ color: '#f1f5f9' }}>{cell.source}</strong>
                </div>
              </div>
            </div>

            {/* Screening Triage Score */}
            <div style={{ backgroundColor: '#1e293b', padding: 18, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Prototype Screening Score
                </div>
                <CellStatusBadge classification={passport.classification} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>
                  {passport.prototypeScore !== null ? passport.prototypeScore : '—'}
                </span>
                <span style={{ fontSize: '1rem', color: '#64748b' }}>/ 100</span>
              </div>

              {latestAnalysis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, fontSize: '0.75rem' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: 4 }}>
                    <div style={{ color: '#64748b' }}>Electrical</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{latestAnalysis.electricalScore}/40</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: 4 }}>
                    <div style={{ color: '#64748b' }}>Thermal</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{latestAnalysis.thermalScore}/30</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: 4 }}>
                    <div style={{ color: '#64748b' }}>Stability</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{latestAnalysis.stabilityScore}/30</div>
                  </div>
                </div>
              )}
            </div>

            {/* Latest Discharge Test Snapshot */}
            {latestTest && (
              <div style={{ backgroundColor: '#1e293b', padding: 18, borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
                  Latest Test Session Snapshot ({latestTest.testId})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: '#64748b' }}>Min Voltage</div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{latestTest.minimumVoltage ?? '—'} V</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Avg Current</div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{latestTest.averageCurrent ?? '—'} A</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Max Temp</div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{latestTest.maximumTemperature ?? '—'} °C</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Duration</div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{latestTest.testDurationSeconds ?? '—'}s</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: QR Code & Verification Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <QRCodeCard cellId={cell.cellId} passportUrl={passport.passportUrl} />

            <div style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 8, fontSize: '0.775rem' }}>
              <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>QR Verification Link:</div>
              <p style={{ color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
                Scannable by field technicians using mobile devices to inspect battery health before disassembly or repacking.
              </p>
              <a
                href={passport.qrApiUrl ? `${passport.qrApiUrl}?format=svg` : `/api/cells/${cell.cellId}/qr?format=svg`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
              >
                <ExternalLink size={12} />
                <span>Server Vector SVG QR</span>
              </a>
            </div>
          </div>
        </div>

        {/* Potential Second-Life Applications */}
        <div style={{ backgroundColor: '#1e293b', padding: 18, borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
            Potential Second-Life Repurposing Applications
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {potentialApplications.map((app, idx) => (
              <div key={idx} style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ color: '#f8fafc' }}>{app.application.replace(/_/g, ' ')}</strong>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: app.suitability === 'HIGH' ? '#34d399' : app.suitability === 'MEDIUM' ? '#fbbf24' : '#ef4444',
                    }}
                  >
                    {app.suitability}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{app.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Custody History */}
        <div style={{ backgroundColor: '#1e293b', padding: 18, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16 }}>
            Chain of Custody & Lifecycle History
          </div>

          <LifecycleTimeline events={lifecycle} />
        </div>

        {/* Official Disclaimer */}
        <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 14, textAlign: 'center' }}>
          {passport.disclaimer}
        </div>
      </div>
    </div>
  );
};
