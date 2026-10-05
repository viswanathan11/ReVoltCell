import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface QRCodeCardProps {
  cellId: string;
  passportUrl: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ cellId, passportUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Digital Passport QR Link
      </div>

      <div style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 8, display: 'inline-block' }}>
        <QRCodeSVG value={passportUrl} size={160} level="M" />
      </div>

      <div style={{ fontSize: '0.825rem', color: '#cbd5e1', marginTop: 14, fontWeight: 600 }}>
        Cell ID: {cellId}
      </div>

      <div
        style={{
          fontSize: '0.725rem',
          color: '#64748b',
          marginTop: 4,
          wordBreak: 'break-all',
          maxWidth: '100%',
        }}
      >
        {passportUrl}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          <span>{copied ? 'Copied URL' : 'Copy Link'}</span>
        </button>

        <a href={passportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          <ExternalLink size={14} />
          <span>Open</span>
        </a>
      </div>
    </div>
  );
};
