import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const links = [
    { to: '/',         label: 'Home' },
    { to: '/news',     label: 'News' },
    { to: '/donations',label: 'Donate' },
    ...(token ? [
      { to: '/announcements', label: 'Announcements' },
      { to: '/events',        label: 'Events' },
      { to: '/members', label: 'Members' },
      { to: '/chat',    label: '💬 Chat' },
    ] : []),
  ];

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <img src="/logo.png" alt="Fajikunda Logo" className="nav-logo" />
          <span>Fajikunda<em> Diaspora Society</em></span>
        </Link>
        <button className="burger" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <ul className={`nav-links ${open ? 'open' : ''}`}>
          {links.map(l => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.to === '/'}
                className={({ isActive }) => isActive ? 'active' : ''}
                onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            </li>
          ))}
          {user?.role === 'admin' && (
            <li>
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>
                ⚙️ Admin
              </NavLink>
            </li>
          )}

          {token ? (
            <li className="nav-user">
              <Link to="/profile" onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}
                title={user?.full_name || user?.username}>
                <div className="user-chip">
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    : (user?.full_name || user?.username || '?')[0].toUpperCase()
                  }
                </div>
              </Link>
              <button onClick={handleLogout} className="logout-link">Sign out</button>
            </li>
          ) : (
            <li className="nav-auth">
              <Link to="/login" className="btn-outline" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/login?mode=register" className="btn-primary" onClick={() => setOpen(false)}>Join Us</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}


