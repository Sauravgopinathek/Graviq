import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../api/client';

const COLORS = ['#6C5CE7', '#00D2FF', '#00E676', '#FFB74D', '#FF5252'];

export default function AnalyticsPage() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    if (selectedBot) {
      loadAnalytics(selectedBot);
    }
  }, [selectedBot]);

  const loadBots = async () => {
    try {
      const res = await api.get('/api/bots');
      const botsList = res.data.bots;
      setBots(botsList);
      if (botsList.length > 0) {
        setSelectedBot(botsList[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load bots:', err);
      setLoading(false);
    }
  };

  const loadAnalytics = async (botId) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/bots/${botId}/analytics`);
      setAnalytics(res.data.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (bots.length === 0 && !loading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <div>
            <h2>Analytics</h2>
            <p>Create a bot first to see analytics</p>
          </div>
        </div>
        <div className="card empty-state">
          <div className="empty-state-icon">📈</div>
          <h3>No bots yet</h3>
          <p>Create your first bot to start tracking conversions.</p>
          <button className="btn btn-primary" onClick={() => navigate('/bots/new')}>
            Create Bot
          </button>
        </div>
      </div>
    );
  }

  const pieData = analytics
    ? [
        { name: 'Converted', value: analytics.conversions },
        { name: 'Dropped Off', value: analytics.dropOffs },
      ]
    : [];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Analytics</h2>
          <p>Track your lead generation performance</p>
        </div>
        <select
          className="form-select"
          style={{ width: 240 }}
          value={selectedBot}
          onChange={(e) => setSelectedBot(e.target.value)}
        >
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>{bot.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading analytics...</div>
      ) : analytics ? (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat-card-label">Conversations</div>
              <div className="stat-card-value">{analytics.totalConversations}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-card-label">Leads Captured</div>
              <div className="stat-card-value">{analytics.totalLeads}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-card-label">Conversion Rate</div>
              <div className="stat-card-value">{analytics.conversionRate}%</div>
            </div>
            <div className="card stat-card">
              <div className="stat-card-label">Avg Messages/Chat</div>
              <div className="stat-card-value">{analytics.avgMessagesPerChat}</div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Conversations Over Time */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Conversations Over Time</h3>
              {analytics.conversationsOverTime?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.conversationsOverTime}>
                    <defs>
                      <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,92,231,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B6B8D', fontSize: 11 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fill: '#6B6B8D', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#16163A', border: '1px solid rgba(108,92,231,0.3)', borderRadius: 8 }}
                      labelStyle={{ color: '#F0F0F8' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#6C5CE7" fillOpacity={1} fill="url(#colorConvs)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data yet</p>
              )}
            </div>

            {/* Leads Over Time */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Leads Over Time</h3>
              {analytics.leadsOverTime?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.leadsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,92,231,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B6B8D', fontSize: 11 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fill: '#6B6B8D', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#16163A', border: '1px solid rgba(108,92,231,0.3)', borderRadius: 8 }}
                      labelStyle={{ color: '#F0F0F8' }}
                    />
                    <Bar dataKey="count" fill="#00D2FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data yet</p>
              )}
            </div>
          </div>

          {/* Conversion Pie */}
          <div className="card" style={{ padding: 24, maxWidth: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Conversion Breakdown</h3>
            {analytics.totalConversations > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data yet</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
