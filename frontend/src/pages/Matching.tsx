import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitBranch, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { cellsApi } from '../api/cellsApi';
import { CellStatusBadge } from '../components/CellStatusBadge';

export const Matching: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cellId) return;
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await cellsApi.getMatches(cellId, 8);
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to match similar cells');
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [cellId]);

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Matching similar cells in staging pool...</div>;
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'No matching data found.'}</div>
        <Link to={`/cells/${cellId}`} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Cell</span>
        </Link>
      </div>
    );
  }

  const matches = data.matches || [];

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
            Cell Similarity Matching: {cellId}
          </h1>
        </div>

        <Link to={`/passport/${cellId}`} className="btn btn-secondary btn-sm">
          <span>Digital Passport</span>
        </Link>
      </div>

      {/* Prominent Pack Safety Warning */}
      <div
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem' }}>
            Pack Assembly Safety Warning
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.825rem', marginTop: 4, lineHeight: 1.4 }}>
            Similarity in prototype screening scores <strong>does not guarantee electrical pack compatibility or safety</strong>. Cells assembled into parallel or series battery banks must be precisely matched by certified internal resistance (ACIR/DCIR), batch SOH, and monitored via active battery management systems.
          </p>
        </div>
      </div>

      {/* Target Reference Cell HUD */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Target Reference Cell Specifications</div>
          <CellStatusBadge classification={data.classification} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Battery ID</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>{data.cellId}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Prototype Score</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', marginTop: 2 }}>{data.score}/100</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Chemistry / V</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
              {data.chemistry} ({data.nominalVoltage}V)
            </div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Voltage Sag</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{data.voltageSag} V</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Thermal Rise</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>+{data.temperatureRise}°C</div>
          </div>
        </div>
      </div>

      {/* Matched Cells Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Closest Matched Candidates</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Ranked by similarity in score, sag, thermal behavior, and chemistry
            </div>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Score</th>
                <th>Score Δ</th>
                <th>Classification</th>
                <th>Chemistry</th>
                <th>Sag (V)</th>
                <th>Thermal Rise</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m: any) => (
                <tr key={m.cellId}>
                  <td style={{ fontWeight: 600, color: '#60a5fa' }}>
                    <Link to={`/cells/${m.cellId}`}>{m.cellId}</Link>
                  </td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{m.score}/100</td>
                  <td style={{ color: '#cbd5e1' }}>
                    ±{m.scoreDifference} pts
                  </td>
                  <td>
                    <CellStatusBadge classification={m.classification} />
                  </td>
                  <td style={{ color: '#94a3b8' }}>
                    {m.chemistry} ({m.nominalVoltage}V)
                  </td>
                  <td>{m.voltageSag} V</td>
                  <td>+{m.temperatureRise}°C</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/cells/${m.cellId}`} className="btn btn-secondary btn-sm" title="View Profile">
                        View
                      </Link>
                      <Link to={`/passport/${m.cellId}`} className="btn btn-secondary btn-sm" title="Passport">
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                    No matching candidate cells with completed tests found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
