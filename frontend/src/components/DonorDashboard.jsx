import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';import API_URL from '../api';
const LEVEL_COLOR = { LOW: '#059669', MEDIUM: '#D97706', HIGH: '#DC2626', CRITICAL: '#7C0000' };
const LEVEL_BG = { LOW: '#D1FAE5', MEDIUM: '#FEF3C7', HIGH: '#FEE2E2', CRITICAL: '#FEE2E2' };
const STATUS_COLOR = { PENDING: '#D97706', ACCEPTED: '#2563EB', COMPLETED: '#059669', CANCELLED: '#6B7280' };
const STATUS_BG = { PENDING: '#FEF3C7', ACCEPTED: '#EFF6FF', COMPLETED: '#D1FAE5', CANCELLED: '#F3F4F6' };

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--gray-200)', background: 'var(--white)',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gray-800)', outline: 'none',
};

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 5 };

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600,
      color: color, background: bg, fontFamily: 'var(--font-display)', letterSpacing: '0.03em', textTransform: 'uppercase',
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

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [locationName, setLocationName] = useState('Fetching…');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [sosAlert, setSosAlert] = useState(null);
  const [sosBusy, setSosBusy] = useState(null);
  const [sosFeedback, setSosFeedback] = useState(null);
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: 'O+', unitsRequired: 1, patientName: '', contactNumber: '',
    emergencyLevel: 'HIGH', message: '', requiredWithinHours: 6,
  });

  const socketRef = useRef(null);
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleAcceptRequest = async (requestId) => {
    setAccepting(requestId);
    try {
      const res = await fetch(`${API_URL}/donor/requests/${requestId}/accept`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to accept request'); return; }
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'ACCEPTED' } : r));
    } catch { alert('Error accepting request'); }
    finally { setAccepting(null); }
  };

  const handleSOS = async (requestId) => {
    if (!window.confirm('Send emergency SOS? This will escalate to CRITICAL and notify all nearby donors via Socket.io and SMS.')) return;
    setSosBusy(requestId);
    try {
      const res = await fetch(`${API_URL}/donor/requests/${requestId}/sos`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'SOS failed'); return; }
      setSosFeedback(data.sosResult);
      setMyRequests(prev => prev.map(r => r._id === requestId ? { ...r, emergencyLevel: 'CRITICAL' } : r));
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, emergencyLevel: 'CRITICAL' } : r));
    } catch { alert('SOS request failed'); }
    finally { setSosBusy(null); }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/donor/create-request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, unitsRequired: Number(form.unitsRequired), requiredWithinHours: Number(form.requiredWithinHours) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to create request'); return; }
      setShowRequestModal(false);
      setForm({ bloodGroup: 'O+', unitsRequired: 1, patientName: '', contactNumber: '', emergencyLevel: 'HIGH', message: '', requiredWithinHours: 6 });
      setMyRequests(prev => [data.request, ...prev]);
      if (data.sosResult) setSosFeedback(data.sosResult);
    } catch { alert('Error creating request'); }
    finally { setSubmitting(false); }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_URL}/donor/requests/${requestId}/complete`, {
        method: 'PUT', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to complete'); return; }
      setMyRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'COMPLETED' } : r));
    } catch { alert('Error completing request'); }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const user = JSON.parse(stored);
    if (user.role !== 'DONOR') { navigate('/login'); return; }

    const fetchData = async () => {
      try {
        const [profileRes, requestsRes, myRequestsRes, donationsRes] = await Promise.all([
          fetch(`${API_URL}/donor/profile/${user._id}`, { credentials: 'include' }),
          fetch(`${API_URL}/donor/requests`, { credentials: 'include' }),
          fetch(`${API_URL}/donor/my-requests`, { credentials: 'include' }),
          fetch(`${API_URL}/donor/donations`, { credentials: 'include' }),
        ]);
        if (!profileRes.ok) throw new Error('Profile fetch failed');
        const { user: profileData } = await profileRes.json();
        setProfile(profileData);

        // Reverse geocode
        if (profileData?.location?.coordinates) {
          const [lon, lat] = profileData.location.coordinates;
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (geo.ok) {
              const gd = await geo.json();
              const loc = gd.address?.city || gd.address?.town || gd.address?.village || gd.address?.county;
              setLocationName(loc ? `${loc}, ${gd.address?.state || gd.address?.country}` : 'Unknown');
            } else setLocationName(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
          } catch { setLocationName(`${lat.toFixed(3)}, ${lon.toFixed(3)}`); }
        } else setLocationName('Not set');

        if (requestsRes.ok) {
          const { requests: reqs } = await requestsRes.json();
          setRequests(reqs || []);
        }

        if (myRequestsRes.ok) {
          const { requests: myReqs } = await myRequestsRes.json();
          setMyRequests(myReqs || []);
        }

        if (donationsRes.ok) {
          const { donations: dons } = await donationsRes.json();
          setDonations(dons || []);
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    fetchData();

    // Socket.io connection for live alerts + SOS
    import('https://cdn.socket.io/4.8.0/socket.io.esm.min.js').then(({ io }) => {
      const socket = io(API_URL, { withCredentials: true });
      socketRef.current = socket;
      
      socket.on('connect', () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          socket.emit('donor:online', { userId: u._id, bloodGroup: u.bloodGroup });
        }
      });

      socket.on('hospital:new-request', (data) => {
        const req = data.request || data;
        setRequests(prev => prev.some(r => r._id === req._id) ? prev : [req, ...prev]);
        
        // Secondary check: if a new standard request is actually critical, show alert too
        if (req.emergencyLevel === 'CRITICAL') {
          setSosAlert({
            type: 'SOS',
            message: data.message || `🚨 URGENT — ${req.bloodGroup} blood critically needed!`,
            request: req,
            timestamp: new Date().toISOString(),
          });
        }
      });

      socket.on('hospital:sos', (alert) => {
        // Ensure alert has necessary data
        if (!alert) return;
        setSosAlert({
          ...alert,
          timestamp: alert.timestamp || new Date().toISOString()
        });
        if (alert.request) {
          setRequests(prev => prev.some(r => r._id === alert.request._id) ? prev : [alert.request, ...prev]);
        }
      });
    }).catch(() => {});

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [navigate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--gray-200)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: 'var(--red)', fontWeight: 500 }}>{error}</p>
    </div>
  );

  const eligible = profile?.isEligibleToDonate;
  const daysLeft = profile?.daysUntilEligible;

  return (
    <>
      {sosAlert && <SOSToast key={sosAlert.timestamp || Date.now()} alert={sosAlert} onDismiss={() => setSosAlert(null)} />}
      <SOSFeedback result={sosFeedback} onClose={() => setSosFeedback(null)} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, animation: 'fadeIn 0.3s ease both', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', marginBottom: 4 }}>
              Welcome, {profile?.name?.split(' ')[0]} 👋
            </h1>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: 'var(--red)', color: 'white',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(200,16,46,0.2)'
            }}
          >
            + Request Blood
          </button>
        </div>

        {/* Profile cards */}
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Blood type', value: profile?.bloodGroup, accent: 'var(--red)' },
            { label: 'Location', value: locationName, accent: 'var(--gray-800)' },
            { label: 'Last donation', value: profile?.lastDonationDate ? new Date(profile.lastDonationDate).toLocaleDateString('en-GB') : 'Never', accent: 'var(--gray-800)' },
            {
              label: 'Eligibility',
              value: eligible ? 'Eligible ✓' : `Wait ${daysLeft}d`,
              accent: eligible ? 'var(--green)' : 'var(--red)',
            },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'var(--white)', borderRadius: 14, padding: '16px 20px',
              border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', animation: 'fadeIn 0.3s ease both',
            }}>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: accent }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Requests */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', overflow: 'hidden', animation: 'fadeIn 0.3s 0.1s ease both' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Blood requests near you</h2>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
          </div>

          {requests.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🩸</div>
              <p style={{ fontWeight: 500 }}>No requests in your area right now</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>You'll be notified when a matching request appears</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {requests.map((req, i) => (
                <div key={req._id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  borderBottom: i < requests.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  animation: `fadeIn 0.3s ${i * 0.05}s ease both`,
                  flexWrap: 'wrap'
                }}>
                  {/* Blood type badge */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: req.emergencyLevel === 'CRITICAL' ? '#FEE2E2' : 'var(--red-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--red)',
                  }}>{req.bloodGroup}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--gray-900)' }}>
                        {req.hospitalName || req.createdBy?.name || 'Hospital'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Badge label={req.emergencyLevel} color={LEVEL_COLOR[req.emergencyLevel]} bg={LEVEL_BG[req.emergencyLevel]} />
                        <Badge label={req.status} color={STATUS_COLOR[req.status]} bg={STATUS_BG[req.status]} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      Patient: {req.patientName} · {req.unitsRequired}u
                      {req.requiredWithinHours && ` · ${req.requiredWithinHours}h`}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
                    {(req.createdBy?._id || req.createdBy) === profile?._id ? (
                      <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Your Request</span>
                    ) : (
                      <>
                        {req.status === 'PENDING' && eligible && (
                          <button onClick={() => handleAcceptRequest(req._id)} disabled={accepting === req._id} style={{
                            padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: accepting === req._id ? 'var(--gray-200)' : 'var(--green)',
                            color: accepting === req._id ? 'var(--gray-500)' : 'white',
                            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: accepting === req._id ? 'not-allowed' : 'pointer',
                          }}>{accepting === req._id ? '…' : 'Accept'}</button>
                        )}
                        {req.status === 'PENDING' && !eligible && (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', display: 'inline-block', maxWidth: 80 }}>Not eligible</span>
                        )}
                        {req.status === 'ACCEPTED' && <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>✓ Accepted</span>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Requests Section */}
        {myRequests.length > 0 && (
          <div style={{ marginTop: 48, background: 'var(--white)', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', overflow: 'hidden', animation: 'fadeIn 0.3s 0.2s ease both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>My Blood Requests</h2>
            </div>
            <div style={{ padding: '8px 0' }}>
              {myRequests.map((req, i) => (
                <div key={req._id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  borderBottom: i < myRequests.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  flexWrap: 'wrap'
                }}>
                   <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--red-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-display)'
                  }}>{req.bloodGroup}</div>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{req.patientName}</span>
                      <Badge label={req.status} color={STATUS_COLOR[req.status]} bg={STATUS_BG[req.status]} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      Requested on {new Date(req.createdAt).toLocaleDateString('en-GB')} • {req.unitsRequired} Units
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {/* SOS Button — only for PENDING/ACCEPTED and not already CRITICAL */}
                    {['PENDING', 'ACCEPTED'].includes(req.status) && req.emergencyLevel !== 'CRITICAL' && (
                      <button
                        onClick={() => handleSOS(req._id)}
                        disabled={sosBusy === req._id}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: 'none',
                          background: 'var(--red)', color: 'white', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {sosBusy === req._id ? '…' : '🚨 SOS'}
                      </button>
                    )}

                    {req.status === 'ACCEPTED' && req.acceptedDonor && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Accepted by {req.acceptedDonor.name}</div>
                        <button
                          onClick={() => handleCompleteRequest(req._id)}
                          style={{
                            marginTop: 4, padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: 'var(--green)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Mark Done
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donation History Section */}
        {donations.length > 0 && (
          <div style={{ marginTop: 48, background: 'var(--white)', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', overflow: 'hidden', animation: 'fadeIn 0.3s 0.3s ease both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>My Donation History</h2>
            </div>
            <div style={{ padding: '8px 0' }}>
              {donations.map((don, i) => (
                <div key={don._id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
                  borderBottom: i < donations.length - 1 ? '1px solid var(--gray-100)' : 'none',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--green-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'var(--green)'
                  }}>✔️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Donated to {don.patientName}</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      Requested by {don.createdBy?.name || 'User'} • Completed on {new Date(don.updatedAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <Badge label="COMPLETED" color="var(--green)" bg="var(--green-light)" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease both'
        }}>
          <div style={{
            background: 'white', borderRadius: 24, width: '100%', maxWidth: 500,
            padding: '32px 32px 40px', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s ease both'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>Request Blood</h2>
              <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--gray-400)', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateRequest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Blood Group</label>
                <select style={inputStyle} value={form.bloodGroup} onChange={set('bloodGroup')}>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Units Required</label>
                <input type="number" min="1" style={inputStyle} value={form.unitsRequired} onChange={set('unitsRequired')} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Patient Name</label>
                <input style={inputStyle} value={form.patientName} onChange={set('patientName')} placeholder="Enter patient name" required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Contact Number</label>
                <input style={inputStyle} value={form.contactNumber} onChange={set('contactNumber')} placeholder="Phone number" required />
              </div>
              <div>
                <label style={labelStyle}>Emergency Level</label>
                <select style={inputStyle} value={form.emergencyLevel} onChange={set('emergencyLevel')}>
                  {['LOW','MEDIUM','HIGH','CRITICAL'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Required Within</label>
                <select style={inputStyle} value={form.requiredWithinHours} onChange={set('requiredWithinHours')}>
                   <option value="1">1 Hour (Urgent)</option>
                   <option value="3">3 Hours</option>
                   <option value="6">6 Hours</option>
                   <option value="12">12 Hours</option>
                   <option value="24">1 Day</option>
                   <option value="48">2 Days</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} style={{
                gridColumn: 'span 2', padding: '14px', borderRadius: 12, border: 'none', marginTop: 8,
                background: submitting ? 'var(--gray-400)' : 'var(--red)', color: 'white',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer'
              }}>{submitting ? 'Creating...' : 'Create Request'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}