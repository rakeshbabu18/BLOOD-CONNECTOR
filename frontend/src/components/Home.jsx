import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = localStorage.getItem('userRole');

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--white)' }}>
      {/* Hero */}
      <section className="stack-mobile" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
        <div style={{ animation: 'fadeIn 0.5s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            background: 'var(--red-light)', borderRadius: 100, marginBottom: 24,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 2s infinite' }}/>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', fontFamily: 'var(--font-display)' }}>Real-time blood network</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 54, lineHeight: 1.05, color: 'var(--gray-900)', letterSpacing: '-1.5px', marginBottom: 20 }}>
            Every second<br/>
            <span style={{ color: 'var(--red)' }}>saves a life.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
            Bridging verified blood donors and hospitals in real time — with location-aware matching, eligibility tracking, and emergency SOS alerts.
          </p>
          
          <div style={{ display: 'flex', gap: 12, maxWidth: 500, flexWrap: 'wrap' }}>
            {user ? (
              <Link to={role === 'hospital' ? '/hospital' : '/donor'} style={{
                flex: 1, padding: '16px 24px', borderRadius: 12, textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, textAlign: 'center',
                color: 'white', background: 'var(--red)',
                boxShadow: '0 4px 14px rgba(200,16,46,0.3)',
                transition: 'transform 0.2s',
              }}
                onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
              >Go to {role === 'hospital' ? 'Hospital' : 'Donor'} Dashboard</Link>
            ) : (
              <>
                <Link to="/register" state={{ role: 'DONOR' }} style={{
                  flex: 1, padding: '16px 24px', borderRadius: 12, textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textAlign: 'center',
                  color: 'white', background: 'var(--red)',
                  boxShadow: '0 4px 14px rgba(200,16,46,0.3)',
                  transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                >Register as donor</Link>
                
                <Link to="/register" state={{ role: 'HOSPITAL' }} style={{
                  flex: 1, padding: '16px 24px', borderRadius: 12, textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textAlign: 'center',
                  color: 'var(--red)', background: 'white',
                  border: '2px solid var(--red)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.background = 'var(--red-light)'; }}
                  onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.background = 'white'; }}
                >Register as hospital</Link>
              </>
            )}
          </div>
        </div>

        {/* Stats card */}
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, animation: 'fadeIn 0.5s 0.15s ease both' }}>
          {[
            { num: '8', label: 'Blood groups supported', color: 'var(--red)' },
            { num: '90', label: 'Day eligibility window', color: 'var(--amber)' },
            { num: '10km', label: 'Default matching radius', color: 'var(--green)' },
            { num: 'SOS', label: 'Emergency SMS alerts', color: 'var(--red)' },
          ].map(({ num, label, color }) => (
            <div key={label} style={{
              background: 'var(--gray-50)', borderRadius: 16, padding: '24px',
              border: '1px solid var(--gray-200)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color, letterSpacing: '-1px', marginBottom: 6 }}>{num}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 400 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'var(--gray-50)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.5px', textAlign: 'center', marginBottom: 48 }}>How it works</h2>
          <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: '📍', title: 'Location-aware matching', desc: 'Donors see only requests within their radius. Hospitals broadcast to nearby verified donors instantly.' },
              { icon: '🔔', title: 'Real-time alerts', desc: 'Socket.io pushes urgent requests to eligible donors the moment a hospital raises one.' },
              { icon: '🚨', title: 'Emergency SOS', desc: 'One button escalates to CRITICAL and fires SMS notifications via Twilio to every reachable donor.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--white)', borderRadius: 16, padding: 28, border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}