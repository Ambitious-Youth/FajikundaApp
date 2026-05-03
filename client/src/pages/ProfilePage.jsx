import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function ProfilePage() {
  const { user, init } = useAuthStore();
  const [form, setForm] = useState({ full_name: '', bio: '', location: '', avatar_url: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [status, setStatus] = useState('');
  const [pwStatus, setPwStatus] = useState('');
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (user) setForm({
      full_name: user.full_name || '',
      bio: user.bio || '',
      location: user.location || '',
      avatar_url: user.avatar_url || '',
    });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault(); setStatus('submitting');
    try {
      await api.patch('/auth/me', form);
      await init(); // refresh user in store
      setStatus('success');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(err.response?.data?.message || 'Failed to save');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm)
      return setPwStatus('New passwords do not match');
    if (pwForm.newPassword.length < 8)
      return setPwStatus('Password must be at least 8 characters');
    setPwStatus('submitting');
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwStatus('success');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwStatus(''), 3000);
    } catch (err) {
      setPwStatus(err.response?.data?.message || 'Failed to change password');
    }
  };

  const avatarLetter = (user?.full_name || user?.username || '?')[0].toUpperCase();

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>👤 My Profile</h1>
      </div>

      {/* Profile header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        background: 'var(--earth)',
        backgroundImage: 'radial-gradient(ellipse at 80% 30%, rgba(200,144,42,0.2) 0%, transparent 60%)',
        borderRadius: 'var(--radius)', padding: '2rem',
        marginBottom: '2rem', border: '1px solid rgba(200,144,42,0.15)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: form.avatar_url ? 'transparent' : 'linear-gradient(135deg,var(--gold),#a06818)',
          border: '3px solid rgba(200,144,42,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-h)', fontSize: '2rem', fontWeight: 700, color: 'var(--white)',
          overflow: 'hidden',
        }}>
          {form.avatar_url
            ? <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
            : avatarLetter}
        </div>
        <div style={{ color: 'var(--cream)' }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.4rem', color: 'var(--cream)', marginBottom: '.2rem' }}>
            {user?.full_name || user?.username}
          </h2>
          <p style={{ fontSize: '.85rem', color: 'rgba(245,239,227,0.6)', marginBottom: '.4rem' }}>@{user?.username} · {user?.email}</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <span className={`tag ${user?.role === 'admin' ? 'gold' : ''}`}>
              {user?.role === 'admin' ? '⭐ Admin' : 'Member'}
            </span>
            {user?.location && <span className="tag">📍 {user.location}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', background: 'var(--cream2)',
        borderRadius: '10px', padding: '4px', marginBottom: '2rem',
      }}>
        {[['profile', '✏️ Edit Profile'], ['password', '🔒 Change Password']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '.5rem', border: 'none', borderRadius: '7px',
            background: tab === id ? 'var(--gold)' : 'transparent',
            color: tab === id ? 'var(--white)' : 'var(--text2)',
            fontFamily: 'var(--font-b)', fontSize: '.9rem',
            fontWeight: tab === id ? 600 : 400,
            cursor: 'pointer', transition: 'var(--transition)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Edit Profile Form */}
      {tab === 'profile' && (
        <div style={{
          background: 'var(--white)', border: '1.5px solid var(--cream2)',
          borderRadius: 'var(--radius)', padding: '2rem', boxShadow: 'var(--shadow)',
        }}>
          <form onSubmit={saveProfile}>
            <div className="field">
              <label>Full Name</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your full name" />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="City, Country e.g. London, UK" />
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={4} placeholder="Tell the community a bit about yourself…" />
            </div>
            <div className="field">
              <label>Avatar URL</label>
              <input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                placeholder="https://… (paste a link to your photo)" />
              {form.avatar_url && (
                <div style={{ marginTop: '.5rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <img src={form.avatar_url} alt="preview" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--cream2)' }}
                    onError={e => e.target.style.display = 'none'} />
                  <span className="text-muted">Preview</span>
                </div>
              )}
            </div>

            {status === 'success' && <p className="form-success">✅ Profile updated!</p>}
            {status && status !== 'success' && status !== 'submitting' && <p className="form-error">{status}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Form */}
      {tab === 'password' && (
        <div style={{
          background: 'var(--white)', border: '1.5px solid var(--cream2)',
          borderRadius: 'var(--radius)', padding: '2rem', boxShadow: 'var(--shadow)',
        }}>
          <form onSubmit={changePassword}>
            <div className="field">
              <label>Current Password</label>
              <input type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Your current password" required />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="At least 8 chars, uppercase, number, special char" required />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password" required />
            </div>

            {pwStatus === 'success' && <p className="form-success">✅ Password changed! Please log in again next time.</p>}
            {pwStatus && pwStatus !== 'success' && pwStatus !== 'submitting' && <p className="form-error">{pwStatus}</p>}
            <p className="form-hint">Password must be 8+ characters with at least one uppercase letter, number, and special character.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={pwStatus === 'submitting'}>
                {pwStatus === 'submitting' ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
