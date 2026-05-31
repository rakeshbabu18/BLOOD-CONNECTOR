import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('userRole');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/common/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-200)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, background: 'var(--red)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px'
          }}>B</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
            Blood<span style={{ color: 'var(--red)' }}>Connector</span>
          </span>
        </Link>

        {/* Mobile Toggle */}
        <button 
          className="nav-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'none', color: 'var(--gray-600)', fontSize: 24 }}
        >
          {menuOpen ? '×' : '☰'}
        </button>

        {/* Nav links */}
        <div className={`nav-links ${menuOpen ? 'open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {role ? (
            <>
              <Link 
                to={role === 'hospital' ? '/hospital' : '/donor'} 
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14,
                  color: isActive('/donor') || isActive('/hospital') ? 'var(--red)' : 'var(--gray-600)',
                  textDecoration: 'none', padding: '6px 12px', borderRadius: 8,
                  background: isActive('/donor') || isActive('/hospital') ? 'var(--red-light)' : 'transparent',
                }}
              >Dashboard</Link>
              <div 
                className="user-controls"
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid var(--gray-200)' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)',
                  flexShrink: 0
                }}>{user?.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ lineHeight: 1.2, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--gray-800)' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role}</div>
                </div>
                <button 
                  onClick={() => { handleLogout(); setMenuOpen(false); }} 
                  style={{
                    marginLeft: 8, padding: '6px 14px', borderRadius: 8,
                    background: 'var(--gray-100)', border: 'none', color: 'var(--gray-600)',
                    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--gray-200)'}
                  onMouseLeave={e => e.target.style.background = 'var(--gray-100)'}
                >Sign out</button>
              </div>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  textAlign: 'center',
                  color: isActive('/login') ? 'white' : 'var(--gray-700)',
                  background: isActive('/login') ? 'var(--red)' : 'white',
                  border: isActive('/login') ? '1px solid var(--red)' : '1px solid var(--gray-200)',
                }}
              >Sign in</Link>
              <Link 
                to="/register" 
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  textAlign: 'center',
                  color: isActive('/register') ? 'white' : 'var(--gray-700)',
                  background: isActive('/register') ? 'var(--red)' : 'white',
                  border: isActive('/register') ? '1px solid var(--red)' : '1px solid var(--gray-200)',
                }}
              >Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
