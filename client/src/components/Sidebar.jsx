import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteValue, setDeleteValue] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteValue.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
      setDeleteError('Enter your email address exactly to confirm deletion.');
      return;
    }

    setDeleteError('');
    setDeleting(true);

    try {
      await deleteAccount();
      navigate('/signup');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const navItems = [
    { to: '/dashboard', icon: 'D', label: 'Dashboard' },
    { to: '/bots', icon: 'B', label: 'Bots' },
    { to: '/analytics', icon: 'A', label: 'Analytics' },
  ];

  const initial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">G</div>
        <h1>Graviq</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <p>{user?.email}</p>
            <span>{user?.plan || 'Free'} plan</span>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="sidebar-danger-panel">
            <p className="sidebar-danger-text">
              Type <strong>{user?.email}</strong> to permanently delete your account.
            </p>
            <input
              type="text"
              className="form-input sidebar-danger-input"
              value={deleteValue}
              onChange={(e) => setDeleteValue(e.target.value)}
              placeholder="Confirm with your email"
            />
            {deleteError ? <div className="form-error">{deleteError}</div> : null}
            <button
              type="button"
              className="btn btn-danger btn-sm sidebar-danger-button"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
            <button
              type="button"
              className="sidebar-cancel"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteValue('');
                setDeleteError('');
              }}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sidebar-delete"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </button>
        )}

        <button className="sidebar-logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
