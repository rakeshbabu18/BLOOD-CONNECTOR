import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid var(--gray-200)', background: 'var(--white)',
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--gray-800)',
  outline: 'none', transition: 'border-color 0.15s',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/common/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }
      localStorage.setItem('userRole', data.user.role.toLowerCase());
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'HOSPITAL' ? '/hospital' : '/donor');
    } catch { 
      setError('Could not reach server. Is the backend running?'); 
      toast.error('Could not reach server.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.3s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--red)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>🩸</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px' }}>Welcome back</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 6 }}>Sign in to your account</p>
        </div>

        <div style={{ background: 'var(--white)', borderRadius: 20, padding: '24px 20px', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#B91C1C', fontSize: 13 }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--red)'} onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--red)'} onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? 'var(--gray-400)' : 'var(--red)',
              color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
          No account? <Link to="/register" style={{ color: 'var(--red)', fontWeight: 500 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
