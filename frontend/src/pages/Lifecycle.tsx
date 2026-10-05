import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Check, FileText } from 'lucide-react';
import { cellsApi } from '../api/cellsApi';
import { LifecycleTimeline } from '../components/LifecycleTimeline';
import { LifecycleEvent } from '../types/analysis';

export const Lifecycle: React.FC = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Event Form State
  const [selectedEvent, setSelectedEvent] = useState<string>('SECOND_LIFE_CANDIDATE');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLifecycle = async () => {
    if (!cellId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cellsApi.getLifecycle(cellId);
      setEvents(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load lifecycle events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLifecycle();
  }, [cellId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellId || !description.trim()) return;

    setSubmitting(true);
    try {
      await cellsApi.addLifecycleEvent(cellId, selectedEvent, description.trim());
      setDescription('');
      fetchLifecycle();
    } catch (err: any) {
      alert(`Failed to add event: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading lifecycle history...</div>;
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/cells/${cellId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Cell Profile</span>
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Lifecycle Provenance: {cellId}
          </h1>
        </div>

        <Link to={`/passport/${cellId}`} className="btn btn-secondary btn-sm">
          <FileText size={14} />
          <span>Digital Passport</span>
        </Link>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Timeline Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Chronological Chain of Custody</div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{events.length} registered milestones</span>
        </div>

        <div style={{ padding: '10px 0' }}>
          <LifecycleTimeline events={events} />
        </div>
      </div>

      {/* Add Milestone Form */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Record Lifecycle Milestone</div>
        </div>

        <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                Milestone Type *
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="EV_BATTERY">EV BATTERY</option>
                <option value="RETIRED">RETIRED</option>
                <option value="RECOVERED">RECOVERED</option>
                <option value="TESTED">TESTED</option>
                <option value="SECOND_LIFE_EVALUATION">SECOND LIFE EVALUATION</option>
                <option value="SECOND_LIFE_CANDIDATE">SECOND LIFE CANDIDATE</option>
                <option value="RECYCLE">RECYCLE</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                Event Log Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Transferred to secondary energy storage research bench."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !description.trim()}>
              <Plus size={14} />
              <span>{submitting ? 'Logging...' : 'Add Milestone Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
