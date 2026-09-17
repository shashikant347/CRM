import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Target, KanbanSquare, ListChecks, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/deals', label: 'Pipeline', icon: KanbanSquare },
  { to: '/activities', label: 'Activities', icon: ListChecks },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span className="brand-name">Web Smile India</span>
        </div>
        <nav className="nav">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                <Icon size={16} strokeWidth={2} />
                {l.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}