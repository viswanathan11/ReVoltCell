import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  Layers,
  Sparkles,
  GitBranch,
  Clock,
  Battery,
} from 'lucide-react';
import { cellsApi } from '../api/cellsApi';
import { CellStatusBadge } from '../components/CellStatusBadge';
import { ScoreGauge } from '../components/ScoreGauge';
import { Cell } from '../types/cell';

export const CellDetails: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [cell, setCell] = useState<Cell | null>(null);
  const [latestTest, setLatestTest] = useState<any>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cellId) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await cellsApi.getById(cellId);
        setCell(res.data.cell);
        setLatestTest(res.data.latestTest);
        setLatestAnalysis(res.data.latestAnalysis);
      } catch (err: any) {
        setError(err.message || 'Failed to load cell details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [cellId]);

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading cell parameters...</div>;
  }

  if (error || !cell) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Cell not found.'}</div>
        <Link to="/cells" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Cells</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/cells" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          <span>Inventory</span>
        </Link>
        <span style={{ color: '#64748b' }}>/</span>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cell Profile</span>
      </div>

      {/* Main Banner */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Battery size={32} color="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{cell.cellId}</h1>
                <CellStatusBadge status={cell.status} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: 4 }}>
                {cell.manufacturer} • {cell.model} • {cell.chemistry}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to={`/test/new?cellId=${cell.cellId}`} className="btn btn-primary">
              <PlayCircle size={16} />
              <span>Run Discharge Test</span>
            </Link>
            <Link to={`/passport/${cell.cellId}`} className="btn btn-secondary">
              <FileText size={16} />
              <span>Digital Passport</span>
            </Link>
          </div>
        </div>

        {/* Quick Nav Sub-bar */}
        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #1f293d', marginTop: 20, paddingTop: 16, flexWrap: 'wrap' }}>
          <Link to={`/analysis/${cell.cellId}`} className="btn btn-secondary btn-sm">
            <Sparkles size={14} color="#10b981" />
            <span>Analysis Breakdown</span>
          </Link>
          <Link to={`/applications/${cell.cellId}`} className="btn btn-secondary btn-sm">
            <Layers size={14} color="#3b82f6" />
            <span>Potential Applications</span>
          </Link>
          <Link to={`/matching/${cell.cellId}`} className="btn btn-secondary btn-sm">
            <GitBranch size={14} color="#f59e0b" />
            <span>Similar Cell Matching</span>
          </Link>
          <Link to={`/lifecycle/${cell.cellId}`} className="btn btn-secondary btn-sm">
            <Clock size={14} color="#a855f7" />
            <span>Lifecycle History</span>
          </Link>
          <Link to={`/cells/${cell.cellId}/tests`} className="btn btn-secondary btn-sm">
            <PlayCircle size={14} color="#06b6d4" />
            <span>All Test Records</span>
          </Link>
        </div>
      </div>

      {/* Grid: Specifications & Latest Triage Score */}
      <div className="grid-cols-2" style={{ marginBottom: 24 }}>
        {/* Cell Specifications */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Physical & Electrical Specifications</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Battery ID</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{cell.cellId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Manufacturer</span>
              <span style={{ color: '#f8fafc' }}>{cell.manufacturer}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Form Factor / Model</span>
              <span style={{ color: '#f8fafc' }}>{cell.model}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Chemistry</span>
              <span style={{ color: '#f8fafc' }}>{cell.chemistry}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Nominal Voltage</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{cell.nominalVoltage} V</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Rated Capacity</span>
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>{cell.ratedCapacityMah} mAh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Recovery Provenance</span>
              <span style={{ color: '#f8fafc' }}>{cell.source}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Registered At</span>
              <span style={{ color: '#94a3b8' }}>{new Date(cell.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Latest Evaluation Score Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Latest Screening Triage</div>
            {latestTest && (
              <Link to={`/test/${latestTest.testId}`} style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
                View {latestTest.testId} →
              </Link>
            )}
          </div>

          {latestAnalysis ? (
            <div>
              <ScoreGauge
                score={latestAnalysis.score}
                classification={latestAnalysis.classification}
                electricalScore={latestAnalysis.electricalScore}
                thermalScore={latestAnalysis.thermalScore}
                stabilityScore={latestAnalysis.stabilityScore}
                voltageSag={latestAnalysis.voltageSag}
                temperatureRise={latestAnalysis.temperatureRise}
              />
              <div style={{ marginTop: 16, padding: '12px 14px', backgroundColor: '#1e293b', borderRadius: 6, fontSize: '0.825rem', color: '#cbd5e1' }}>
                <strong>Recommendation:</strong> {latestAnalysis.recommendation}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p>No screening tests completed yet for this cell.</p>
              <Link to={`/test/new?cellId=${cell.cellId}`} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                Start Discharge Evaluation
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
