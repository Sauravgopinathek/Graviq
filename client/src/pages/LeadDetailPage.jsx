import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const res = await api.get(`/api/leads/${id}`);
      setLead(res.data.lead);
    } catch (err) {
      console.error('Failed to load lead:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading lead...</div>;
  }

  if (!lead) {
    return (
      <div className="card empty-state">
        <h3>Lead not found</h3>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const messages = lead.messages || [];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Lead: {lead.name || 'Unknown'}</h2>
          <p>Captured on {new Date(lead.created_at).toLocaleString()}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Lead Info Card */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Contact Info</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
            <p style={{ fontSize: 15, fontWeight: 500 }}>{lead.name || '—'}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
            <p style={{ fontSize: 15, fontWeight: 500 }}>{lead.phone || '—'}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
            <p style={{ fontSize: 15, fontWeight: 500 }}>{lead.email || '—'}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Intent</label>
            <span className={`badge ${lead.intent === 'interested' ? 'badge-success' : 'badge-warning'}`}>
              {lead.intent || 'unknown'}
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Confidence</label>
            <p style={{ fontSize: 15, fontWeight: 500 }}>
              {lead.confidence_score ? `${(lead.confidence_score * 100).toFixed(0)}%` : '—'}
            </p>
          </div>

          {lead.source_url && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Source</label>
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--accent-light)', wordBreak: 'break-all' }}
              >
                {lead.source_url}
              </a>
            </div>
          )}
        </div>

        {/* Chat Replay */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Chat Replay</h3>

          {messages.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No conversation recorded.</p>
          ) : (
            <div className="chat-replay">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-replay-message ${msg.role === 'assistant' ? 'bot' : 'user'}`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
