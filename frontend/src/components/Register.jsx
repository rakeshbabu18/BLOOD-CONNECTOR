import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--gray-200)', background: 'var(--white)',
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--gray-800)', outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 6 };
const selectStyle = { ...inputStyle, cursor: 'pointer' };

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function Register() {
  const location = useLocation();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phoneNumber: '',
    role: location.state?.role || 'DONOR', bloodGroup: 'O+', lastDonationDate: '',
    longitude: '', latitude: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (location.state?.role) {
      setForm(f => ({ ...f, role: location.state.role }));
    }
  }, [location.state]);

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleGetLocation = () => {
    if (!navigator.geolocation) return setLocError('Geolocation not supported');
    setLocating(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm(f => ({ ...f, longitude: pos.coords.longitude, latitude: pos.coords.latitude })); setLocating(false); },
      () => { setLocError('Location access denied — enter manually'); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      toast.error('Invalid phone number');
      setLoading(false);
      return;
    }

    const payload = {
      name: form.name, email: form.email, password: form.password,
      phoneNumber: form.phoneNumber, role: form.role,
      bloodGroup: form.role === 'DONOR' ? form.bloodGroup : undefined,
      lastDonationDate: form.role === 'DONOR' && form.lastDonationDate ? new Date(form.lastDonationDate).toISOString() : undefined,
      location: { type: 'Point', coordinates: [Number(form.longitude), Number(form.latitude)] },
    };
    try {
      const res = await fetch(`${API_URL}/common/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { 
        setError(data.message || 'Registration failed'); 
        toast.error(data.message || 'Registration failed');
        return; 
      }
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch { 
      setError('Could not reach server.'); 
      toast.error('Could not reach server.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.3s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px' }}>Create account</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 6 }}>Join the blood donor network</p>
        </div>

        <div style={{ background: 'var(--white)', borderRadius: 20, padding: '24px 20px', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)' }}>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#B91C1C', fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Role toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
              {['DONOR','HOSPITAL'].map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))} style={{
                  padding: '10px', borderRadius: 10, border: '1.5px solid',
                  borderColor: form.role === r ? 'var(--red)' : 'var(--gray-200)',
                  background: form.role === r ? 'var(--red-light)' : 'var(--gray-50)',
                  color: form.role === r ? 'var(--red)' : 'var(--gray-600)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>{r === 'DONOR' ? '🩸 Donor' : '🏥 Hospital'}</button>
              ))}
            </div>

            <div>
              <label style={labelStyle}>{form.role === 'HOSPITAL' ? 'Hospital name' : 'Full name'}</label>
              <input style={inputStyle} value={form.name} onChange={set('name')} placeholder={form.role === 'HOSPITAL' ? 'City General Hospital' : 'Dr. Jane Smith'} required />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={labelStyle}>Phone number (10 digits)</label>
              <input type="tel" maxLength="10" style={inputStyle} value={form.phoneNumber} onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm(f => ({ ...f, phoneNumber: val }));
              }} placeholder="9876543210" required />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: showPassword ? 'var(--red)' : 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                  <div style={{
                    width: 32, height: 18, borderRadius: 20, background: showPassword ? 'var(--red)' : 'var(--gray-200)',
                    position: 'relative', transition: 'all 0.2s ease',
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 3, left: showPassword ? 17 : 3,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }} />
                  </div>
                </div>
              </div>
              <input type={showPassword ? "text" : "password"} style={inputStyle} value={form.password} onChange={set('password')} placeholder="Min 6 characters" required />
            </div>

            {form.role === 'DONOR' && (
              <>
                <div>
                  <label style={labelStyle}>Blood group</label>
                  <select style={selectStyle} value={form.bloodGroup} onChange={set('bloodGroup')}>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Last donation date <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="date" style={inputStyle} value={form.lastDonationDate} onChange={set('lastDonationDate')} />
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Location</label>
              <button type="button" onClick={handleGetLocation} disabled={locating} style={{
                width: '100%', padding: '10px', borderRadius: 10, marginBottom: 8,
                border: '1.5px dashed var(--gray-200)', background: 'var(--gray-50)',
                fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gray-600)', cursor: 'pointer',
              }}>{locating ? '📍 Detecting…' : '📍 Use my current location'}</button>
              {locError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{locError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={inputStyle} type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={set('longitude')} required />
                <input style={inputStyle} type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={set('latitude')} required />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              padding: '13px', borderRadius: 10, border: 'none', marginTop: 4,
              background: loading ? 'var(--gray-400)' : 'var(--red)',
              color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
            }}>{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--red)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
