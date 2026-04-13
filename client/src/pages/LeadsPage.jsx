import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LeadsPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [botName, setBotName] = useState('');
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('');

  useEffect(() => {
    loadLeads();
    loadBot();
  }, [page]);

  const loadBot = async () => {
    try {
      const res = await api.get(`/api/bots/${botId}`);
      setBotName(res.data.bot.name);
    } catch {}
  };

  const loadLeads = async () => {
    try {
      const res = await api.get(`/api/bots/${botId}/leads?page=${page}&limit=20`);
      setLeads(res.data.leads);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get(`/api/bots/${botId}/leads/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${botId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export leads.');
    }
  };

  const sendWebhook = async () => {
    if (!webhookUrl) return;
    setWebhookStatus('sending');
    try {
      const res = await api.post(`/api/bots/${botId}/leads/webhook`, { webhookUrl });
      setWebhookStatus(`Sent ${res.data.count} leads successfully!`);
    } catch (err) {
      setWebhookStatus('Failed to send. Check webhook URL.');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading leads...</div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Leads — {botName || 'Bot'}</h2>
          <p>{pagination.total || 0} total leads captured</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/bots/${botId}`)}>
            ← Bot Settings
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Webhook Section */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Push to CRM (Webhook)</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="url"
            className="form-input"
            placeholder="https://your-crm.com/api/leads"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={sendWebhook} disabled={!webhookUrl}>
            Send Leads
          </button>
        </div>
        {webhookStatus && (
          <p style={{ fontSize: 13, marginTop: 8, color: webhookStatus.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>
            {webhookStatus}
          </p>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No leads yet</h3>
          <p>Leads will appear here once visitors start chatting with your bot.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Intent</th>
                  <th>Confidence</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{lead.name || '—'}</td>
                    <td>{lead.phone || '—'}</td>
                    <td>{lead.email || '—'}</td>
                    <td>
                      <span className={`badge ${lead.intent === 'interested' ? 'badge-success' : 'badge-warning'}`}>
                        {lead.intent || 'unknown'}
                      </span>
                    </td>
                    <td>{lead.confidence_score ? `${(lead.confidence_score * 100).toFixed(0)}%` : '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.source_url || '—'}
                    </td>
                    <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
