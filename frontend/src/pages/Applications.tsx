import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, CheckCircle2, AlertCircle, FileText, GitBranch } from 'lucide-react';
import { cellsApi } from '../api/cellsApi';

export const Applications: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [data, setData] = useState<{
    primary: any;
    alternatives: any[];
    allRecommendations: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cellId) return;
    const fetchApps = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await cellsApi.getApplications(cellId);
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load application recommendations');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [cellId]);

  const getSuitabilityBadge = (suitability: string) => {
    switch (suitability) {
      case 'HIGH':
        return <span className="badge badge-good">HIGH SUITABILITY</span>;
      case 'MEDIUM':
        return <span className="badge badge-eval">MEDIUM SUITABILITY</span>;
      case 'LOW':
        return <span className="badge badge-low">LOW SUITABILITY</span>;
      case 'NOT_RECOMMENDED':
        return <span className="badge badge-unsuitable">NOT RECOMMENDED</span>;
      default:
        return <span className="badge">{suitability}</span>;
    }
  };

  const formatAppName = (appName: string) => {
    return appName.replace(/_/g, ' ');
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Evaluating potential applications...</div>;
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'No recommendations generated.'}</div>
        <Link to={`/cells/${cellId}`} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Cell</span>
        </Link>
      </div>
    );
  }

  const primary = data.primary;
  const alternatives = data.alternatives || [];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/cells/${cellId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Cell Profile</span>
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Second-Life Application Mapping: {cellId}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/matching/${cellId}`} className="btn btn-secondary btn-sm">
            <GitBranch size={14} color="#f59e0b" />
            <span>Cell Matching</span>
          </Link>
          <Link to={`/passport/${cellId}`} className="btn btn-secondary btn-sm">
            <FileText size={14} />
            <span>Passport</span>
          </Link>
        </div>
      </div>

      {/* Primary Recommended Application */}
      {primary && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
            <CheckCircle2 size={16} />
            <span>Primary Potential Second-Life Application</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
              {formatAppName(primary.application)}
            </h2>
            {getSuitabilityBadge(primary.suitability)}
          </div>

          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, backgroundColor: '#1e293b', padding: '12px 14px', borderRadius: 6 }}>
            {primary.reason}
          </p>
        </div>
      )}

      {/* Alternative Applications List */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Alternative Second-Life Possibilities</div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ranked by measured stability profile</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alternatives.map((alt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '14px 16px',
                backgroundColor: '#1e293b',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {formatAppName(alt.application)}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: 4 }}>
                  {alt.reason}
                </div>
              </div>

              <div>{getSuitabilityBadge(alt.suitability)}</div>
            </div>
          ))}

          {alternatives.length === 0 && !primary && (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              No application evaluations recorded yet. Run a discharge test first.
            </div>
          )}
        </div>
      </div>

      <div className="disclaimer-box">
        <strong>Application Notice:</strong> Recommendations are calculated estimates of potential second-life duty cycles. They do not constitute formal commercial suitability certifications. Ensure appropriate BMS protection, thermal monitoring, and pack balancing in all prototype builds.
      </div>
    </div>
  );
};
