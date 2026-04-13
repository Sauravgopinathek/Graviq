import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const botsRes = await api.get('/api/bots');
      const botsList = botsRes.data.bots;
      setBots(botsList);

      // Aggregate quick stats from all bots
      let totalLeads = 0;
      let totalConversations = 0;

      for (const bot of botsList.slice(0, 5)) {
        try {
          const analyticsRes = await api.get(`/api/bots/${bot.id}/analytics`);
          const a = analyticsRes.data.analytics;
          totalLeads += a.totalLeads;
          totalConversations += a.totalConversations;
        } catch {
          // skip if analytics fails
        }
      }

      setStats({ totalBots: botsList.length, totalLeads, totalConversations });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setStats({ totalBots: 0, totalLeads: 0, totalConversations: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your AI lead generation performance</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
          + Create Bot
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-card-label">Total Bots</div>
          <div className="stat-card-value">{stats?.totalBots || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Total Leads</div>
          <div className="stat-card-value">{stats?.totalLeads || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Conversations</div>
          <div className="stat-card-value">{stats?.totalConversations || 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Conversion Rate</div>
          <div className="stat-card-value">
            {stats?.totalConversations
              ? ((stats.totalLeads / stats.totalConversations) * 100).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {bots.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🤖</div>
          <h3>No bots yet</h3>
          <p>Create your first AI lead generation bot to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
            Create Your First Bot
          </button>
        </div>
      ) : (
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Your Bots</h3>
          <div className="bot-grid">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="card bot-card"
                onClick={() => navigate(`/bots/${bot.id}`)}
              >
                <div className="bot-card-header">
                  <div className="bot-card-name">
                    🤖 {bot.name}
                  </div>
                  <span className="bot-card-tone">{bot.config?.tone || 'friendly'}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
                  {bot.config?.businessContext?.slice(0, 80) || 'No business context set'}
                  {bot.config?.businessContext?.length > 80 ? '...' : ''}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
