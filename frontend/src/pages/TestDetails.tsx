import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Square,
  CheckCircle,
  FileText,
  Activity,
  Zap,
  Thermometer,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { testsApi } from '../api/testsApi';
import { TestSession } from '../types/test';
import { CellStatusBadge } from '../components/CellStatusBadge';
import { ScoreGauge } from '../components/ScoreGauge';
import { TestChart } from '../components/TestChart';

export const TestDetails: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTest = async () => {
    if (!testId) return;
    try {
      const res = await testsApi.getById(testId);
      setTest(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load test session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTest();
  }, [testId]);

  // Polling when test is RUNNING
  useEffect(() => {
    if (!test || test.status !== 'RUNNING') return;
    const interval = setInterval(fetchTest, 2000);
    return () => clearInterval(interval);
  }, [test?.status, testId]);

  const handleStart = async () => {
    if (!testId) return;
    setActionLoading(true);
    try {
      await testsApi.start(testId);
      fetchTest();
    } catch (err: any) {
      alert(`Start failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!testId) return;
    setActionLoading(true);
    try {
      await testsApi.stop(testId, 'USER_STOP');
      fetchTest();
    } catch (err: any) {
      alert(`Stop failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!testId) return;
    setActionLoading(true);
    try {
      await testsApi.complete(testId);
      fetchTest();
    } catch (err: any) {
      alert(`Complete failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulate = async (profile: 'GOOD' | 'WEAK' | 'HOT' | 'UNSTABLE') => {
    if (!testId) return;
    setActionLoading(true);
    try {
      await testsApi.simulateMock(testId, profile);
      fetchTest();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading test session data...</div>;
  }

  if (error || !test) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Test not found.'}</div>
        <Link to="/cells" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Cells</span>
        </Link>
      </div>
    );
  }

  const measurements = test.measurements || [];
  const latestM = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  const currentVoltage = latestM ? latestM.voltage : test.finalVoltage ?? test.initialVoltage ?? '—';
  const currentCurrent = latestM ? latestM.current : test.averageCurrent ?? '—';
  const currentTemp = latestM ? latestM.temperature : test.maximumTemperature ?? '—';
  const elapsed = latestM ? `${latestM.elapsedSeconds}s` : test.testDurationSeconds ? `${test.testDurationSeconds}s` : '0s';

  return (
    <div>
      {/* Top Breadcrumb & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/cells/${test.cellId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Cell {test.cellId}</span>
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Test Session {test.testId}
          </h1>
          <CellStatusBadge status={test.status} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchTest} title="Refresh">
            <RefreshCw size={14} />
          </button>

          {test.status === 'PENDING' && (
            <button className="btn btn-primary btn-sm" onClick={handleStart} disabled={actionLoading}>
              <Play size={14} />
              <span>Start Run</span>
            </button>
          )}

          {test.status === 'RUNNING' && (
            <>
              <button className="btn btn-danger btn-sm" onClick={handleStop} disabled={actionLoading}>
                <Square size={14} />
                <span>Stop</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleComplete} disabled={actionLoading}>
                <CheckCircle size={14} />
                <span>Complete Test</span>
              </button>
            </>
          )}

          {test.status === 'COMPLETED' && (
            <>
              <Link to={`/analysis/${test.cellId}`} className="btn btn-secondary btn-sm">
                <Sparkles size={14} color="#10b981" />
                <span>Analysis</span>
              </Link>
              <Link to={`/passport/${test.cellId}`} className="btn btn-secondary btn-sm">
                <FileText size={14} />
                <span>Passport</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Live Measurement HUD Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Discharge Voltage</span>
            <Zap size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
            {currentVoltage} <span style={{ fontSize: '1rem', color: '#64748b' }}>V</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            Min: {test.minimumVoltage ? `${test.minimumVoltage} V` : '—'}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Discharge Current</span>
            <Activity size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
            {currentCurrent} <span style={{ fontSize: '1rem', color: '#64748b' }}>A</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            Load: {test.loadResistanceOhms || 5.0} Ω nominal
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cell Temperature</span>
            <Thermometer size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
            {currentTemp} <span style={{ fontSize: '1rem', color: '#64748b' }}>°C</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            Rise: {test.temperatureRise ? `+${test.temperatureRise}°C` : '—'}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Elapsed Duration</span>
            <Clock size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
            {elapsed}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            Points logged: {measurements.length}
          </div>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Discharge Response Curve</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              High-resolution transient voltage, load current, and thermal drift
            </div>
          </div>

          {/* Quick Mock hardware simulator actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mock Replay:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => handleSimulate('GOOD')} disabled={actionLoading}>
              Sim Good
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleSimulate('WEAK')} disabled={actionLoading}>
              Sim Weak
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleSimulate('HOT')} disabled={actionLoading}>
              Sim Hot
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleSimulate('UNSTABLE')} disabled={actionLoading}>
              Sim Unstable
            </button>
          </div>
        </div>

        <TestChart measurements={measurements} height={360} />
      </div>

      {/* Analysis Outcome if completed */}
      {test.analysis && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">Screening Evaluation Outcome</div>
            <Link to={`/analysis/${test.cellId}`} style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
              Full Analysis Breakdown →
            </Link>
          </div>

          <ScoreGauge
            score={test.analysis.score}
            classification={test.analysis.classification}
            electricalScore={test.analysis.electricalScore}
            thermalScore={test.analysis.thermalScore}
            stabilityScore={test.analysis.stabilityScore}
            voltageSag={test.analysis.voltageSag}
            temperatureRise={test.analysis.temperatureRise}
          />
        </div>
      )}
    </div>
  );
};
