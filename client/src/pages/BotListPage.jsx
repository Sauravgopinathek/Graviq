import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function BotListPage() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const res = await api.get('/api/bots');
      setBots(res.data.bots);
    } catch (err) {
      console.error('Failed to load bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBot = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this bot? All leads and conversations will be lost.')) return;

    try {
      await api.delete(`/api/bots/${id}`);
      setBots(bots.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading bots...</div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Bots</h2>
          <p>Manage your AI lead generation bots</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
          + Create Bot
        </button>
      </div>

      {bots.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🤖</div>
          <h3>No bots created yet</h3>
          <p>Create your first bot to start capturing leads with AI.</p>
          <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
            Create Bot
          </button>
        </div>
      ) : (
        <div className="bot-grid">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="card bot-card"
              onClick={() => navigate(`/bots/${bot.id}`)}
            >
              <div className="bot-card-header">
                <div className="bot-card-name">🤖 {bot.name}</div>
                <span className="bot-card-tone">{bot.config?.tone || 'friendly'}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {bot.config?.businessContext?.slice(0, 100) || 'No business context set'}
                {bot.config?.businessContext?.length > 100 ? '...' : ''}
              </p>
              <div className="bot-card-stats">
                <div className="bot-card-stat">
                  <span>{bot.domains?.length || 0}</span>
                  Domains
                </div>
                <div className="bot-card-stat">
                  <span>{new Date(bot.created_at).toLocaleDateString()}</span>
                  Created
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/bots/${bot.id}/leads`); }}
                >
                  View Leads
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => deleteBot(bot.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
