import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Layers, FileText, PlayCircle, ShieldCheck } from 'lucide-react';
import { analysisApi } from '../api/analysisApi';
import { cellsApi } from '../api/cellsApi';
import { Analysis as AnalysisType } from '../types/analysis';
import { Cell } from '../types/cell';
import { ScoreGauge } from '../components/ScoreGauge';
import { ReportChat } from '../components/ReportChat';
import { VoltIQAvatar } from '../components/VoltIQAvatar';

export const Analysis: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [cell, setCell] = useState<Cell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!cellId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [anRes, cellRes] = await Promise.all([
          analysisApi.getByCellId(cellId),
          cellsApi.getById(cellId),
        ]);
        setAnalysis(anRes.data);
        setCell(cellRes.data.cell);
      } catch (err: any) {
        setError(err.message || 'No analysis recorded for this cell yet.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cellId]);

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading analysis report...</div>;
  }

  if (error || !analysis) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Analysis record missing.'}</div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 20 }}>
          This cell has not completed a discharge test yet. Run a test to calculate screening metrics.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to={`/cells/${cellId}`} className="btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Cell Profile</span>
          </Link>
          <Link to={`/test/new?cellId=${cellId}`} className="btn btn-primary">
            <PlayCircle size={16} />
            <span>Run Test</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/cells/${cellId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Cell Profile</span>
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Battery Screening Analysis: {cellId}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/applications/${cellId}`} className="btn btn-secondary btn-sm">
            <Layers size={14} color="#3b82f6" />
            <span>Potential Applications</span>
          </Link>
          <Link to={`/passport/${cellId}`} className="btn btn-secondary btn-sm">
            <FileText size={14} />
            <span>Passport</span>
          </Link>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Prototype Triage Score</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Based on controlled discharge evaluation {analysis.testId}
            </div>
          </div>
          <Link to={`/test/${analysis.testId}`} className="btn btn-secondary btn-sm">
            View Test Session
          </Link>
        </div>

        <ScoreGauge
          score={analysis.score}
          classification={analysis.classification}
          electricalScore={analysis.electricalScore}
          thermalScore={analysis.thermalScore}
          stabilityScore={analysis.stabilityScore}
          voltageSag={analysis.voltageSag}
          temperatureRise={analysis.temperatureRise}
        />

        <div style={{ marginTop: 20, padding: 16, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
            Screening Recommendation:
          </div>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            {analysis.recommendation}
          </p>
        </div>
      </div>

      {/* Breakdown Details Grid */}
      <div className="grid-cols-2" style={{ marginBottom: 24 }}>
        {/* Electrical Health */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#10b981" />
              <span>Electrical Delivery</span>
            </div>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{analysis.electricalScore} / 40</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Voltage Sag under Load</span>
              <span style={{ fontWeight: 600, color: analysis.voltageSag > 0.4 ? '#f59e0b' : '#34d399' }}>
                {analysis.voltageSag} V
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Cell Chemistry</span>
              <span style={{ color: '#f8fafc' }}>{cell?.chemistry || 'Li-ion'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Nominal Rating</span>
              <span style={{ color: '#f8fafc' }}>{cell?.nominalVoltage}V • {cell?.ratedCapacityMah}mAh</span>
            </div>
          </div>
        </div>

        {/* Thermal & Stability Health */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#f59e0b" />
              <span>Thermal & Stability</span>
            </div>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>
              {analysis.thermalScore + analysis.stabilityScore} / 60
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Thermal Rise (ΔT)</span>
              <span style={{ fontWeight: 600, color: analysis.temperatureRise > 10 ? '#ef4444' : '#34d399' }}>
                +{analysis.temperatureRise} °C
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Discharge Stability</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{analysis.stabilityScore} / 30 pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Evaluation Date</span>
              <span style={{ color: '#94a3b8' }}>{new Date(analysis.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VoltIQ AI Partner Callout Bar */}
      <div
        className="card"
        style={{
          marginTop: 20,
          marginBottom: 20,
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <VoltIQAvatar size={42} mode="dashboard" glow animate />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>VoltIQ Screening Advisor</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Ask VoltIQ why this cell received its score breakdown or what qualified tests to run next.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.825rem' }}
          onClick={() => setIsChatOpen(true)}
        >
          <Sparkles size={14} />
          <span>Chat with VoltIQ</span>
        </button>
      </div>

      {/* Floating VoltIQ AI Partner Widget */}
      <ReportChat
        testId={analysis.testId}
        cellId={cellId}
        mode="dashboard"
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />

      {/* Screening Disclaimer */}
      <div className="disclaimer-box">
        <strong>Important Safety Notice:</strong> The score and classification provided above represent an automated prototype screening triage for exploratory reuse. They do not constitute certified State-of-Health (SOH), impedance spectroscopy (EIS), or BMS pack safety approvals.
      </div>
    </div>
  );
};
