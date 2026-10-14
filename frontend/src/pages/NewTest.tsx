import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PlayCircle, Cpu, Sliders, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cellsApi } from '../api/cellsApi';
import { testsApi } from '../api/testsApi';
import { Cell } from '../types/cell';

export const NewTest: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCellId = searchParams.get('cellId') || '';

  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState(preselectedCellId);
  const [loadResistance, setLoadResistance] = useState(5.0);
  const [powerRating, setPowerRating] = useState(10.0);

  // Hardware vs Mock mode toggle (defaults to false for physical hardware testing)
  const [isMockMode, setIsMockMode] = useState(false);
  const [mockProfile, setMockProfile] = useState<'GOOD' | 'WEAK' | 'HOT' | 'UNSTABLE'>('GOOD');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCells = async () => {
      try {
        const res = await cellsApi.list({ limit: 100 });
        setCells(res.data);
        if (!selectedCellId && res.data.length > 0) {
          setSelectedCellId(res.data[0].cellId);
        }
      } catch (err: any) {
        setError('Failed to fetch cell list');
      }
    };
    loadCells();
  }, []);

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCellId) {
      setError('Please select a cell.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Test record
      const testRes = await testsApi.create({
        cellId: selectedCellId,
        loadResistanceOhms: loadResistance,
        loadPowerRatingWatts: powerRating,
      });

      const testId = testRes.data.testId;

      if (isMockMode) {
        // Run mock hardware simulation immediately
        await testsApi.simulateMock(testId, mockProfile);
        navigate(`/test/${testId}`);
      } else {
        // Start test session in RUNNING mode and navigate to live screen
        await testsApi.start(testId);
        navigate(`/test/${testId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start test session.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/cells" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          <span>Back</span>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
          Configure Discharge Screening Session
        </h1>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleStartTest} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Cell Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
            Select Target Battery Cell *
          </label>
          <select
            value={selectedCellId}
            onChange={(e) => setSelectedCellId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px' }}
            required
          >
            <option value="">-- Choose a cell from inventory --</option>
            {cells.map((c) => (
              <option key={c.cellId} value={c.cellId}>
                {c.cellId} ({c.manufacturer} {c.model} • {c.nominalVoltage}V {c.ratedCapacityMah}mAh) [{c.status}]
              </option>
            ))}
          </select>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Or register a new cell under the Cells Inventory tab.
          </div>
        </div>

        {/* Load Parameters */}
        <div style={{ padding: 16, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 12 }}>
            <Sliders size={16} color="#3b82f6" />
            <span>Constant Resistive Load Specifications</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                Load Resistance (Ω)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={loadResistance}
                onChange={(e) => setLoadResistance(parseFloat(e.target.value) || 5.0)}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Nominal IRLZ44N circuit: 5.0 Ω</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                Power Rating (Watts)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={powerRating}
                onChange={(e) => setPowerRating(parseFloat(e.target.value) || 10.0)}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Heat sink rating: 10 W</span>
            </div>
          </div>
        </div>

        {/* Hardware Mode vs Mock Mode */}
        <div style={{ padding: 16, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>
              <Cpu size={16} color="#10b981" />
              <span>Execution Source: Mock vs Real ESP32</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: isMockMode ? '#34d399' : '#94a3b8' }}>
              <input
                type="checkbox"
                checked={isMockMode}
                onChange={(e) => setIsMockMode(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              <span>Mock Simulation Mode</span>
            </label>
          </div>

          {isMockMode ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 10 }}>
                Synthesizes 120 seconds of realistic sensor discharge behavior for testing without physical hardware.
              </p>

              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                Select Simulation Profile:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['GOOD', 'WEAK', 'HOT', 'UNSTABLE'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${mockProfile === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMockProfile(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
              Live Hardware Mode selected: The backend will await continuous measurements from the ESP32 (INA219 + DS18B20) over Wi-Fi.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Link to="/cells" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <PlayCircle size={16} />
            <span>{submitting ? 'Initializing...' : isMockMode ? 'Run Simulation Test' : 'Launch Live Session'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
