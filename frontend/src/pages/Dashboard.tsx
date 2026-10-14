import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Battery,
  CheckCircle,
  Activity,
  AlertTriangle,
  PlayCircle,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { dashboardApi, DashboardSummary, RecentTestItem, ScoreDistributionItem } from '../api/dashboardApi';
import { StatCard } from '../components/StatCard';
import { CellStatusBadge } from '../components/CellStatusBadge';
import { ReportChat } from '../components/ReportChat';
import { VoltIQAvatar } from '../components/VoltIQAvatar';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell as RechartsCell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTests, setRecentTests] = useState<RecentTestItem[]>([]);
  const [distribution, setDistribution] = useState<ScoreDistributionItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [sumRes, recRes, distRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentTests(8),
        dashboardApi.getScoreDistribution(),
      ]);

      setSummary(sumRes.data);
      setRecentTests(recRes.data);
      setDistribution(distRes.data.distribution);
      if (recRes.data.length > 0) {
        setSelectedReportId((prev) => prev || recRes.data[0].testId);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to load dashboard metrics');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // Silent auto-refresh every 2.5 seconds so hardware test completions show up instantly
    const interval = setInterval(() => {
      fetchData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const getBarColor = (classification: string) => {
    switch (classification) {
      case 'GOOD':
        return '#10b981';
      case 'FURTHER_EVALUATION':
        return '#f59e0b';
      case 'LOW_PERFORMANCE':
        return '#f97316';
      case 'UNSUITABLE':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div>
      {/* Title & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc' }}>Screening Operations Dashboard</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
              Live Sync
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 4 }}>
            Rapid triage and second-life qualification for recovered Li-ion cells.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(false)} title="Refresh Dashboard">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/cells" className="btn btn-secondary">
            <Plus size={16} />
            <span>Manage Cells</span>
          </Link>
          <Link to="/test/new" className="btn btn-primary">
            <PlayCircle size={16} />
            <span>New Test Session</span>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Inventory"
          value={loading ? '...' : summary?.totalCells ?? 0}
          subtext={`${summary?.registeredCells ?? 0} pending initial test`}
          icon={<Battery size={20} color="#3b82f6" />}
          color="#3b82f6"
        />
        <StatCard
          label="Cells Evaluated"
          value={loading ? '...' : summary?.testedCells ?? 0}
          subtext={`${summary?.testingCells ?? 0} currently in active test`}
          icon={<CheckCircle size={20} color="#10b981" />}
          color="#10b981"
        />
        <StatCard
          label="Good Candidates"
          value={loading ? '...' : summary?.goodCells ?? 0}
          subtext="Score ≥ 80 | Low impedance"
          icon={<Activity size={20} color="#10b981" />}
          color="#10b981"
        />
        <StatCard
          label="Further Eval / Weak"
          value={loading ? '...' : (summary?.furtherEvaluation ?? 0) + (summary?.lowPerformance ?? 0)}
          subtext={`${summary?.unsuitable ?? 0} marked for recycle`}
          icon={<AlertTriangle size={20} color="#f59e0b" />}
          color="#f59e0b"
        />
      </div>

      {/* Charts & Tables Section */}
      <div className="grid-cols-2" style={{ marginBottom: 24 }}>
        {/* Score Distribution Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Prototype Score Distribution</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Triage Buckets</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="range" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Cells Count" radius={[4, 4, 0, 0]}>
                    {distribution.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={getBarColor(entry.classification)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                No score distribution data yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Triage Classification Summary */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Second-Life Readiness Overview</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prototype Classification</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#1e293b', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.9rem' }}>GOOD (Score 80–100)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>High storage / buffered solar energy candidate</div>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>{summary?.goodCells ?? 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#1e293b', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.9rem' }}>FURTHER EVALUATION (Score 65–79)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>LED lighting / auxiliary non-critical backup</div>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{summary?.furtherEvaluation ?? 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#1e293b', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#f87171', fontSize: '0.9rem' }}>LOW PERFORMANCE (Score 45–64)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Low-draw intermittent electronics / telemetry</div>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>{summary?.lowPerformance ?? 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#1e293b', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#9ca3af', fontSize: '0.9rem' }}>UNSUITABLE (&lt; 45 or Thermal Fail)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Safety limit breached. Slated for recycling</div>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#9ca3af' }}>{summary?.unsuitable ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Test Sessions Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Discharge Evaluations</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>Latest automated test executions</div>
          </div>
          <Link to="/test/new" className="btn btn-secondary btn-sm">
            Launch Test
          </Link>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test ID</th>
                <th>Cell ID</th>
                <th>Model</th>
                <th>Status</th>
                <th>Score</th>
                <th>Classification</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentTests.map((t) => (
                <tr key={t.testId}>
                  <td style={{ fontWeight: 600, color: '#60a5fa' }}>
                    <Link to={`/test/${t.testId}`}>{t.testId}</Link>
                  </td>
                  <td>
                    <Link to={`/cells/${t.cellId}`} style={{ color: '#f1f5f9', textDecoration: 'underline' }}>
                      {t.cellId}
                    </Link>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{t.cellModel || '18650'}</td>
                  <td>
                    <CellStatusBadge status={t.status} />
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {t.score !== null && t.score !== undefined ? (
                      <span style={{ color: t.score >= 80 ? '#10b981' : t.score >= 65 ? '#f59e0b' : '#ef4444' }}>
                        {t.score}/100
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <CellStatusBadge classification={t.classification} />
                  </td>
                  <td style={{ color: '#94a3b8' }}>{t.durationSeconds ? `${t.durationSeconds}s` : '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/test/${t.testId}`} className="btn btn-secondary btn-sm">
                        View Curve
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: selectedReportId === t.testId ? '#38bdf8' : undefined,
                          borderColor: selectedReportId === t.testId ? '#38bdf8' : undefined,
                        }}
                        onClick={() => {
                          setSelectedReportId(t.testId);
                          setIsChatOpen(true);
                        }}
                        title="Chat with VoltIQ about this report"
                      >
                        <Sparkles size={12} color={selectedReportId === t.testId ? '#38bdf8' : '#94a3b8'} />
                        <span>VoltIQ</span>
                      </button>
                      <Link to={`/passport/${t.cellId}`} className="btn btn-secondary btn-sm">
                        Passport
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {recentTests.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No recent test sessions. Launch a new test above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard VoltIQ AI Assistant Bar */}
      <div className="card" style={{ marginTop: 24, marginBottom: 24, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <VoltIQAvatar size={42} mode="dashboard" glow animate />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="card-title">VoltIQ AI Battery Intelligence Partner</span>
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
                  ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                Report-aware AI assistant explaining discharge curves, screening scores, and potential second-life applications.
              </div>
            </div>
          </div>

          {/* Test Report Selector & Launch Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Report:</span>
            <select
              value={selectedReportId || ''}
              onChange={(e) => setSelectedReportId(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: '0.825rem',
                outline: 'none',
              }}
            >
              {recentTests.map((t) => (
                <option key={t.testId} value={t.testId}>
                  {t.testId} — {t.cellId} ({t.classification || 'UNTESTED'}, Score: {t.score ?? '—'})
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsChatOpen(true)}
              disabled={!selectedReportId}
            >
              <Sparkles size={14} />
              <span>Open Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating VoltIQ AI Partner Widget */}
      {selectedReportId && (
        <ReportChat
          testId={selectedReportId}
          mode="dashboard"
          isOpen={isChatOpen}
          onOpenChange={setIsChatOpen}
        />
      )}

      {/* Prototype Screening Notice */}
      <div className="disclaimer-box">
        <strong>Notice on Prototype Screening:</strong> ReVoltCell is a rapid pre-screening triage platform designed to identify high-potential candidates for secondary utilization. Calculated prototype scores and classifications do not constitute certified State-of-Health (SOH) certifications or pack safety compliance ratings.
      </div>
    </div>
  );
};
