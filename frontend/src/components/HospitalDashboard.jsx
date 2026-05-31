import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../api';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const LEVEL_COLOR = { LOW: '#059669', MEDIUM: '#D97706', HIGH: '#DC2626', CRITICAL: '#7C0000' };
const LEVEL_BG = { LOW: '#D1FAE5', MEDIUM: '#FEF3C7', HIGH: '#FEE2E2', CRITICAL: '#FEE2E2' };
const STATUS_COLOR = { PENDING: '#D97706', ACCEPTED: '#2563EB', COMPLETED: '#059669', CANCELLED: '#6B7280' };
const STATUS_BG = { PENDING: '#FEF3C7', ACCEPTED: '#EFF6FF', COMPLETED: '#D1FAE5', CANCELLED: '#F3F4F6' };

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--gray-200)', background: 'var(--white)',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gray-800)', outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 5 };

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
      borderRadius: 100, fontSize: 11, fontWeight: 600, color, background: bg,
      fontFamily: 'var(--font-display)', letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>{label}</span>
  );
}

function SOSFeedback({ result, onClose }) {
  if (!result) return null;
  return (
    <div style={{
      position: 'fixed', top: 80, right: 20, zIndex: 999,
      background: 'var(--white)', borderRadius: 14, padding: '20px 24px', maxWidth: 320,
      border: '2px solid var(--red)', boxShadow: 'var(--shadow-lg)',
      animation: 'slideIn 0.3s ease both',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--red)' }}>
        🚨 SOS Broadcast sent!
      </div>
      <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
        {result.smsAttempted > 0 ? (
          <p>SMS sent to {result.smsAttempted - result.smsErrors.length} of {result.smsAttempted} nearby donors.</p>
        ) : (
          <p>Nearby donors have been notified via real-time alerts.</p>
        )}
      </div>
      <button onClick={onClose} style={{
        marginTop: 12, padding: '6px 14px', borderRadius: 8, border: 'none',
        background: 'var(--gray-100)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
      }}>Dismiss</button>
    </div>
  );
}

// Toast for SOS alerts
function SOSToast({ alert, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 12000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 10000,
      background: '#7C0000', color: 'white', borderRadius: 14, padding: '16px 20px',
      maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease both, sosRing 1s ease 3',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            🚨 SOS ALERT
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{alert.message}</div>
          {alert.request?.contactNumber && (
            <a href={`tel:${alert.request.contactNumber}`} style={{
              display: 'inline-block', marginTop: 10, padding: '7px 14px', borderRadius: 8,
              background: 'white', color: '#7C0000', fontWeight: 700, fontSize: 13,
              textDecoration: 'none', fontFamily: 'var(--font-display)',
            }}>📞 Call now: {alert.request.contactNumber}</a>
          )}
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

export default function HospitalDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sosBusy, setSosBusy] = useState(null);
  const [sosFeedback, setSosFeedback] = useState(null);
  const [sosAlert, setSosAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: 'O+', unitsRequired: 1, patientName: '', contactNumber: '',
    emergencyLevel: 'HIGH', message: '', requiredWithinHours: 6,
  });
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const fetchData = useCallback(async () => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const user = JSON.parse(stored);
    if (user.role !== 'HOSPITAL') { navigate('/login'); return; }
    setProfile(user);
    try {
      const res = await fetch(`${API_URL}/hospital/my-requests`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => {
    fetchData();
    
    // Socket.io connection for live alerts
    import('https://cdn.socket.io/4.8.0/socket.io.esm.min.js').then(({ io }) => {
      const socket = io(API_URL, { withCredentials: true });
      socketRef.current = socket;
      
      socket.on('hospital:sos', (alert) => {
        setSosAlert(alert);
        // Refresh data to show the new CRITICAL status
        fetchData();
      });

      socket.on('hospital:new-request', (data) => {
        fetchData();
      });
    }).catch(() => {});

    const interval = setInterval(fetchData, 15000); // Polling as fallback, less frequent
    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/hospital/create-request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, unitsRequired: Number(form.unitsRequired), requiredWithinHours: Number(form.requiredWithinHours) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to create'); return; }
      setShowModal(false);
      setForm({ bloodGroup: 'O+', unitsRequired: 1, patientName: '', contactNumber: '', emergencyLevel: 'HIGH', message: '', requiredWithinHours: 6 });
      if (data.sosResult) setSosFeedback(data.sosResult);
      fetchData();
    } catch { alert('Server error'); }
    finally { setSubmitting(false); }
  };

  const handleSOS = async (requestId) => {
    if (!window.confirm('Send emergency SOS? This will escalate to CRITICAL and notify all nearby donors via Socket.io and SMS.')) return;
    setSosBusy(requestId);
    try {
      const res = await fetch(`${API_URL}/hospital/requests/${requestId}/sos`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'SOS failed'); return; }
      setSosFeedback(data.sosResult);
      fetchData();
    } catch { alert('SOS request failed'); }
    finally { setSosBusy(null); }
  };

  const handleAction = async (requestId, action) => {
    try {
      const res = await fetch(`${API_URL}/hospital/requests/${requestId}/${action}`, {
        method: 'PUT', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      fetchData();
    } catch { alert('Action failed'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--gray-200)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: 'var(--red)', fontWeight: 500 }}>{error}</p>
    </div>
  );

  return (
    <>
      {sosAlert && <SOSToast key={sosAlert.timestamp || Date.now()} alert={sosAlert} onDismiss={() => setSosAlert(null)} />}
      <SOSFeedback result={sosFeedback} onClose={() => setSosFeedback(null)} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, animation: 'fadeIn 0.3s ease both', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', marginBottom: 4 }}>
              {profile?.name}
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Manage your blood requests</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: 'var(--red)', color: 'white',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(200,16,46,0.3)',
          }}>+ Request blood</button>
        </div>

        {/* Stats */}
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Total requests', value: requests.length },
            { label: 'Pending', value: requests.filter(r => r.status === 'PENDING').length, color: '#D97706' },
            { label: 'Completed', value: requests.filter(r => r.status === 'COMPLETED').length, color: '#059669' },
            { label: 'Cancelled', value: requests.filter(r => r.status === 'CANCELLED').length, color: '#6B7280' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--white)', borderRadius: 14, padding: '16px 20px',
              border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: color || 'var(--gray-900)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Requests table */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', overflow: 'hidden', animation: 'fadeIn 0.3s 0.1s ease both' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Your blood requests</h2>
          </div>

          {requests.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏥</div>
              <p style={{ fontWeight: 500 }}>No requests yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Click "Request blood" to create your first request</p>
            </div>
          ) : (
            <div>
              {requests.map((req, i) => (
                <div key={req._id} style={{
                  display: 'flex', gap: 16, padding: '16px 20px', alignItems: 'center', flexWrap: 'wrap',
                  borderBottom: i < requests.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  animation: `fadeIn 0.3s ${i * 0.04}s ease both`,
                }}>
                  {/* Blood type */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: req.emergencyLevel === 'CRITICAL' ? '#FEE2E2' : 'var(--red-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--red)',
                  }}>{req.bloodGroup}</div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{req.patientName}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Badge label={req.emergencyLevel} color={LEVEL_COLOR[req.emergencyLevel]} bg={LEVEL_BG[req.emergencyLevel]} />
                        <Badge label={req.status} color={STATUS_COLOR[req.status]} bg={STATUS_BG[req.status]} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      {req.unitsRequired}u · within {req.requiredWithinHours}h · 📞 {req.contactNumber}
                    </div>
                    {req.acceptedDonor && (
                      <div style={{ fontSize: 12, marginTop: 4, color: 'var(--green)', fontWeight: 500 }}>
                        ✓ {req.acceptedDonor.name} ({req.acceptedDonor.phoneNumber})
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {['PENDING', 'ACCEPTED'].includes(req.status) && (
                      <button
                        onClick={() => handleSOS(req._id)}
                        disabled={sosBusy === req._id}
                        title="Emergency SOS — alerts all nearby donors by socket + SMS"
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: '#7C0000', color: 'white',
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                          animation: (sosBusy !== req._id && req.emergencyLevel !== 'CRITICAL') ? 'sosRing 2s ease infinite' : 'none',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        {sosBusy === req._id ? '…' : '🚨 SOS'}
                      </button>
                    )}

                    {req.status === 'ACCEPTED' && (
                      <button onClick={() => handleAction(req._id, 'complete')} style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'var(--green-light)', color: 'var(--green)',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
                      }}>✓ Complete</button>
                    )}
                    {['PENDING', 'ACCEPTED'].includes(req.status) && (
                      <button onClick={() => { if (window.confirm('Cancel this request?')) handleAction(req._id, 'cancel'); }} style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'var(--gray-100)', color: 'var(--gray-600)',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
                      }}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create request modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, zIndex: 500,
        }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: 20, padding: '24px',
            width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
            animation: 'fadeIn 0.2s ease both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Request blood</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Blood group</label>
                  <select style={inputStyle} value={form.bloodGroup} onChange={set('bloodGroup')}>
                    {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Units required</label>
                  <input type="number" min="1" style={inputStyle} value={form.unitsRequired} onChange={set('unitsRequired')} required />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Patient name</label>
                <input style={inputStyle} value={form.patientName} onChange={set('patientName')} placeholder="Full name" required />
              </div>
              <div>
                <label style={labelStyle}>Contact number</label>
                <input type="tel" style={inputStyle} value={form.contactNumber} onChange={set('contactNumber')} placeholder="+91 98765 43210" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Emergency level</label>
                  <select style={inputStyle} value={form.emergencyLevel} onChange={set('emergencyLevel')}>
                    {['LOW','MEDIUM','HIGH','CRITICAL'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Required within (hours)</label>
                  <input type="number" min="1" style={inputStyle} value={form.requiredWithinHours} onChange={set('requiredWithinHours')} required />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Message <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional)</span></label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.message} onChange={set('message')} placeholder="Additional notes…" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: 'var(--gray-100)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                  background: submitting ? 'var(--gray-400)' : 'var(--red)', color: 'white',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
                }}>{submitting ? 'Sending…' : 'Send request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}