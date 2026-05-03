import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', location: '', invite_code: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else {
        const res = await register(form);
        // Registration no longer returns a token — show pending message instead
        setSuccess(res?.message || 'Registration successful! Your account is pending admin approval.');
        setForm({ name: '', username: '', email: '', password: '', location: '', invite_code: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-hero">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
          <h1>Fajikunda Society</h1>
          <p>Connecting our community across the diaspora — one story at a time.</p>
          <div className="auth-hero-stats">
            <div className="auth-stat"><strong>500+</strong><span>Members</span></div>
            <div className="auth-stat"><strong>12</strong><span>Countries</span></div>
            <div className="auth-stat"><strong>8 yrs</strong><span>Together</span></div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Welcome back' : 'Join the community'}</h2>
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</button>
          </div>

          {/* Pending approval success state */}
          {success ? (
            <div style={{
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              border: '1.5px solid #34d399',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>⏳</div>
              <strong style={{ display: 'block', color: '#065f46', marginBottom: '.5rem' }}>Registration Submitted!</strong>
              <p style={{ fontSize: '.88rem', color: '#047857', margin: 0 }}>{success}</p>
              <button
                className="btn-outline"
                style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => { setSuccess(''); setMode('login'); }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input name="name" value={form.name} onChange={set} placeholder="Amara Jallow" required />
                  </div>
                  <div className="field">
                    <label>Username</label>
                    <input name="username" value={form.username} onChange={set} placeholder="amara_j" required />
                  </div>
                  <div className="field">
                    <label>Location (City, Country)</label>
                    <input name="location" value={form.location} onChange={set} placeholder="London, UK" />
                  </div>
                </>
              )}
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={set} placeholder="you@example.com" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input name="password" type="password" value={form.password} onChange={set} placeholder="••••••••" required />
              </div>
              {mode === 'register' && (
                <>
                  <div className="field">
                    <label>Invite Code</label>
                    <input
                      name="invite_code"
                      value={form.invite_code}
                      onChange={e => setForm(f => ({ ...f, invite_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. FAJIKUNDA2024"
                      required
                      style={{ letterSpacing: '0.1em', fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </div>
                  <p className="form-hint">You need an invite code to register. Contact the admin if you don't have one.</p>
                </>
              )}
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Request Access'}
              </button>
            </form>
          )}

          {mode === 'login' && !success && (
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.88rem', color: 'var(--text3)' }}>
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}





// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '../store/authStore';

// export default function AuthPage() {
//   const [mode, setMode] = useState('login');
//   const [form, setForm] = useState({ name: '', username: '', email: '', password: '', location: '' });
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { login, register } = useAuthStore();
//   const navigate = useNavigate();

//   const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

//   const submit = async (e) => {
//     e.preventDefault();
//     setError(''); setLoading(true);
//     try {
//       if (mode === 'login') await login(form.email, form.password);
//       else await register(form);
//       navigate('/');
//     } catch (err) {
//       setError(err.response?.data?.message || err.response?.data?.error || 'Something went wrong');
//     } finally { setLoading(false); }
//   };

//   return (
//     <div className="auth-wrap">
//       <div className="auth-left">
//         <div className="auth-hero">
//           <img src="/logo.png" alt="Logo" className="auth-logo" />
//           <h1>Fajikunda Society</h1>
//           <p>Connecting our community across the diaspora — one story at a time.</p>
//           <div className="auth-hero-stats">
//             <div className="auth-stat"><strong>500+</strong><span>Members</span></div>
//             <div className="auth-stat"><strong>12</strong><span>Countries</span></div>
//             <div className="auth-stat"><strong>8 yrs</strong><span>Together</span></div>
//           </div>
//         </div>
//       </div>
//       <div className="auth-right">
//         <div className="auth-card">
//           <h2>{mode === 'login' ? 'Welcome back' : 'Join the community'}</h2>
//           <div className="auth-tabs">
//             <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
//             <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
//           </div>
//           <form onSubmit={submit}>
//             {mode === 'register' && (
//               <>
//                 <div className="field">
//                   <label>Full Name</label>
//                   <input name="name" value={form.name} onChange={set} placeholder="Amara Jallow" required />
//                 </div>
//                 <div className="field">
//                   <label>Username</label>
//                   <input name="username" value={form.username} onChange={set} placeholder="amara_j" required />
//                 </div>
//                 <div className="field">
//                   <label>Location (City, Country)</label>
//                   <input name="location" value={form.location} onChange={set} placeholder="London, UK" />
//                 </div>
//               </>
//             )}
//             <div className="field">
//               <label>Email</label>
//               <input name="email" type="email" value={form.email} onChange={set} placeholder="you@example.com" required />
//             </div>
//             <div className="field">
//               <label>Password</label>
//               <input name="password" type="password" value={form.password} onChange={set} placeholder="••••••••" required />
//             </div>
//             {mode === 'register' && (
//               <p className="form-hint">Password must be 8+ characters with uppercase, number, and special character.</p>
//             )}
//             {error && <p className="form-error">{error}</p>}
//             <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
//               {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
//             </button>
//           </form>
//           {mode === 'login' && (
//             <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.88rem', color: 'var(--text3)' }}>
//               <Link to="/forgot-password">Forgot your password?</Link>
//             </p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }








