import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { cellsApi } from '../api/cellsApi';
import { CellStatusBadge } from '../components/CellStatusBadge';

export const CellTests: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [tests, setTests] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cellId) return;
    const fetchTests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await cellsApi.getTests(cellId, page, 15);
        setTests(res.data);
        setTotalPages(res.pagination.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to load test history');
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [cellId, page]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={`/cells/${cellId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Cell Profile</span>
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Test History: {cellId}
          </h1>
        </div>

        <Link to={`/test/new?cellId=${cellId}`} className="btn btn-primary btn-sm">
          <PlayCircle size={14} />
          <span>New Test</span>
        </Link>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test ID</th>
                <th>Status</th>
                <th>Initial V</th>
                <th>Final V</th>
                <th>Temp Rise</th>
                <th>Duration</th>
                <th>Score</th>
                <th>Classification</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.testId}>
                  <td style={{ fontWeight: 600, color: '#60a5fa' }}>
                    <Link to={`/test/${t.testId}`}>{t.testId}</Link>
                  </td>
                  <td>
                    <CellStatusBadge status={t.status} />
                  </td>
                  <td>{t.initialVoltage ? `${t.initialVoltage} V` : '—'}</td>
                  <td>{t.finalVoltage ? `${t.finalVoltage} V` : '—'}</td>
                  <td>{t.temperatureRise ? `+${t.temperatureRise}°C` : '—'}</td>
                  <td>{t.testDurationSeconds ? `${t.testDurationSeconds}s` : '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {t.analysis?.score !== null && t.analysis?.score !== undefined ? (
                      <span style={{ color: t.analysis.score >= 80 ? '#10b981' : t.analysis.score >= 65 ? '#f59e0b' : '#ef4444' }}>
                        {t.analysis.score}/100
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <CellStatusBadge classification={t.analysis?.classification} />
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link to={`/test/${t.testId}`} className="btn btn-secondary btn-sm">
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {tests.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    No discharge tests found for this cell.
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
