import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, PlayCircle, Eye, Archive, X, Check } from 'lucide-react';
import { cellsApi, CreateCellPayload } from '../api/cellsApi';
import { Cell } from '../types/cell';
import { CellStatusBadge } from '../components/CellStatusBadge';

export const Cells: React.FC = () => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Cell Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCellPayload>({
    cellId: '',
    manufacturer: '',
    model: '18650',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2500,
    source: 'Recovered EV battery',
    manufactureDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCells = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cellsApi.list({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setCells(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load cells');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCells();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCells();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await cellsApi.create(formData);
      setIsModalOpen(false);
      setFormData({
        cellId: '',
        manufacturer: '',
        model: '18650',
        chemistry: 'Li-ion',
        nominalVoltage: 3.7,
        ratedCapacityMah: 2500,
        source: 'Recovered EV battery',
        manufactureDate: '',
      });
      fetchCells();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register cell');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (cellId: string) => {
    if (!window.confirm(`Archive cell ${cellId}? It will be removed from active screening pool.`)) return;
    try {
      await cellsApi.archive(cellId);
      fetchCells();
    } catch (err: any) {
      alert(`Error archiving cell: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>Cell Inventory & Staging</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: 2 }}>
            Total registered cells: {totalCount}
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Register New Cell</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Cell ID, Manufacturer, Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#94a3b8" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="TESTING">TESTING</option>
              <option value="TESTED">TESTED</option>
              <option value="FAILED">FAILED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Cells Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cell ID</th>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Chemistry</th>
                <th>Nominal (V)</th>
                <th>Rated (mAh)</th>
                <th>Status</th>
                <th>Score</th>
                <th>Classification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => (
                <tr key={cell.id}>
                  <td style={{ fontWeight: 600, color: '#60a5fa' }}>
                    <Link to={`/cells/${cell.cellId}`}>{cell.cellId}</Link>
                  </td>
                  <td>{cell.manufacturer}</td>
                  <td>{cell.model}</td>
                  <td style={{ color: '#94a3b8' }}>{cell.chemistry}</td>
                  <td>{cell.nominalVoltage} V</td>
                  <td>{cell.ratedCapacityMah} mAh</td>
                  <td>
                    <CellStatusBadge status={cell.status} />
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {cell.latestScore !== null && cell.latestScore !== undefined ? (
                      <span style={{ color: cell.latestScore >= 80 ? '#10b981' : cell.latestScore >= 65 ? '#f59e0b' : '#ef4444' }}>
                        {cell.latestScore}/100
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>
                  <td>
                    <CellStatusBadge classification={cell.classification} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/cells/${cell.cellId}`} className="btn btn-secondary btn-sm" title="View Cell Details">
                        <Eye size={13} />
                      </Link>
                      <Link to={`/test/new?cellId=${cell.cellId}`} className="btn btn-primary btn-sm" title="Run Discharge Test">
                        <PlayCircle size={13} />
                      </Link>
                      <Link to={`/passport/${cell.cellId}`} className="btn btn-secondary btn-sm" title="Digital Passport">
                        Passport
                      </Link>
                      {cell.status !== 'ARCHIVED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleArchive(cell.cellId)}
                          title="Archive"
                        >
                          <Archive size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {cells.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    No matching cells found in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #1f293d' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Cell Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>Register New Cell</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  Cell ID (Unique identifier) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EV-CELL-011"
                  value={formData.cellId}
                  onChange={(e) => setFormData({ ...formData, cellId: e.target.value.trim() })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LG Chem"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 18650-HG2"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                    Nominal Voltage (V) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min="0.1"
                    value={formData.nominalVoltage}
                    onChange={(e) => setFormData({ ...formData, nominalVoltage: parseFloat(e.target.value) || 3.7 })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                    Rated Capacity (mAh) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.ratedCapacityMah}
                    onChange={(e) => setFormData({ ...formData, ratedCapacityMah: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  Recovery Source / Provenance
                </label>
                <input
                  type="text"
                  placeholder="e.g. Recovered from retired fleet delivery van"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Check size={16} />
                  <span>{submitting ? 'Registering...' : 'Register Cell'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
