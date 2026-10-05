import React from 'react';

interface CellStatusBadgeProps {
  status?: string | null;
  classification?: string | null;
}

export const CellStatusBadge: React.FC<CellStatusBadgeProps> = ({ status, classification }) => {
  if (classification) {
    switch (classification) {
      case 'GOOD':
        return <span className="badge badge-good">GOOD</span>;
      case 'FURTHER_EVALUATION':
        return <span className="badge badge-eval">FURTHER EVAL</span>;
      case 'LOW_PERFORMANCE':
        return <span className="badge badge-low">LOW PERF</span>;
      case 'UNSUITABLE':
        return <span className="badge badge-unsuitable">UNSUITABLE</span>;
      default:
        return <span className="badge">{classification}</span>;
    }
  }

  if (status) {
    switch (status) {
      case 'REGISTERED':
        return <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>REGISTERED</span>;
      case 'TESTING':
        return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>TESTING</span>;
      case 'TESTED':
        return <span className="badge badge-good">TESTED</span>;
      case 'FAILED':
        return <span className="badge badge-low">FAILED</span>;
      case 'ARCHIVED':
        return <span className="badge badge-unsuitable">ARCHIVED</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  return <span className="badge" style={{ color: '#64748b' }}>N/A</span>;
};
