import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { format } from 'date-fns';


// ─── Shared Components ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26,18,9,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', animation: 'fadeIn .15s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)',
        padding: '2rem', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)', animation: 'fadeUp .2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.4rem', color: 'var(--earth)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text3)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirm({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel}>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

function Msg({ status, ok }) {
  if (!status || status === 'submitting') return null;
  if (status === 'success') return <p className="form-success">✅ {ok}</p>;
  return <p className="form-error">{status}</p>;
}

function F({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/announcements'),
      api.get('/events'),
      api.get('/news'),
      api.get('/members'),
      api.get('/donations'),
    ]).then(([a, e, n, m, d]) => {
      setStats({
        announcements: a.status === 'fulfilled' ? a.value.data.length : '—',
        events:        e.status === 'fulfilled' ? e.value.data.length : '—',
        news:          n.status === 'fulfilled' ? n.value.data.length : '—',
        members:       m.status === 'fulfilled' ? m.value.data.length : '—',
        raised:        d.status === 'fulfilled' ? `£${Number(d.value.data?.stats?.total || 0).toLocaleString()}` : '—',
        donors:        d.status === 'fulfilled' ? (d.value.data?.stats?.count || 0) : '—',
      });
    });
  }, []);

  const boxes = [
    { label: 'Announcements', key: 'announcements', icon: '📢' },
    { label: 'Events',        key: 'events',        icon: '📅' },
    { label: 'News Articles', key: 'news',          icon: '📰' },
    { label: 'Members',       key: 'members',       icon: '🤝' },
    { label: 'Total Raised',  key: 'raised',        icon: '💰' },
    { label: 'Donors',        key: 'donors',        icon: '💝' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {boxes.map(b => (
          <div key={b.key} className="stat-box">
            <div style={{ fontSize: '1.6rem', marginBottom: '.3rem' }}>{b.icon}</div>
            <strong>{stats ? stats[b.key] : '…'}</strong>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontSize: '1.1rem', marginBottom: '.75rem', color: 'var(--earth)' }}>Admin Capabilities</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {['📢 Create & edit announcements', '📅 Manage events', '📰 Publish news articles', '💰 Track donations', '🤝 Approve & manage members', '⭐ Promote admins'].map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Announcements ────────────────────────────────────────────────────────────

function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState('');
  const blank = { title: '', content: '', priority: 'normal', is_pinned: false, is_published: true };
  const [form, setForm] = useState(blank);

  const load = () => { setLoading(true); api.get('/announcements').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(blank); setEditing(null); setStatus(''); setModal(true); };
  const openEdit   = a  => { setForm({ title: a.title, content: a.content, priority: a.priority, is_pinned: !!a.is_pinned, is_published: !!a.is_published }); setEditing(a); setStatus(''); setModal(true); };

  const submit = async e => {
    e.preventDefault(); setStatus('submitting');
    try {
      editing ? await api.put(`/announcements/${editing.id}`, form) : await api.post('/announcements', form);
      setStatus('success'); load(); setTimeout(() => setModal(false), 800);
    } catch (err) { setStatus(err.response?.data?.error || 'Failed to save'); }
  };

  const remove = async () => {
    await api.delete(`/announcements/${deleting.id}`).catch(() => {}); setDeleting(null); load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={openCreate}>+ New Announcement</button>
      </div>
      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {items.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
              background: 'var(--white)', border: '1.5px solid var(--cream2)',
              borderLeft: `4px solid ${a.priority === 'urgent' ? 'var(--red)' : a.priority === 'high' ? 'var(--gold)' : 'var(--cream3)'}`,
              borderRadius: 'var(--radius)', padding: '1rem 1.25rem', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '.3rem' }}>
                  <strong style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)' }}>{a.title}</strong>
                  <span className={`priority-badge ${a.priority}`}>{a.priority}</span>
                  {a.is_pinned ? <span className="pin-badge">📌</span> : null}
                  {!a.is_published ? <span className="tag">Draft</span> : null}
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: '.25rem' }}>{a.content.slice(0, 120)}…</p>
                <span className="card-meta">{format(new Date(a.published_at || Date.now()), 'MMM d, yyyy')} · {a.full_name || a.username}</span>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => openEdit(a)}>✏️ Edit</button>
                <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setDeleting(a)}>🗑️</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="empty">No announcements yet.</p>}
        </div>
      )}
      {modal && (
        <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setModal(false)}>
          <form onSubmit={submit}>
            <F label="Title *"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></F>
            <F label="Content *"><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={5} /></F>
            <F label="Priority">
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </F>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
              <label className="checkbox-label"><input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} /> Pin to top</label>
              <label className="checkbox-label"><input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} /> Published</label>
            </div>
            <Msg status={status} ok={editing ? 'Updated!' : 'Created!'} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>{status === 'submitting' ? 'Saving…' : editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && <Confirm message={`Delete "${deleting.title}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────

function Events() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState('');
  const blank = { title: '', description: '', location: '', is_virtual: false, meeting_url: '', start_date: '', end_date: '', max_rsvp: '', is_published: true };
  const [form, setForm] = useState(blank);

  const load = () => { setLoading(true); api.get('/events').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);
  const fmt = d => d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : '';

  const openCreate = () => { setForm(blank); setEditing(null); setStatus(''); setModal(true); };
  const openEdit = ev => {
    setForm({ title: ev.title, description: ev.description || '', location: ev.location || '', is_virtual: !!ev.is_virtual, meeting_url: ev.meeting_url || '', start_date: fmt(ev.start_date), end_date: fmt(ev.end_date), max_rsvp: ev.max_rsvp || '', is_published: !!ev.is_published });
    setEditing(ev); setStatus(''); setModal(true);
  };

  const submit = async e => {
    e.preventDefault(); setStatus('submitting');
    try {
      editing ? await api.put(`/events/${editing.id}`, form) : await api.post('/events', form);
      setStatus('success'); load(); setTimeout(() => setModal(false), 800);
    } catch (err) { setStatus(err.response?.data?.error || 'Failed to save'); }
  };

  const remove = async () => { await api.delete(`/events/${deleting.id}`).catch(() => {}); setDeleting(null); load(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={openCreate}>+ New Event</button>
      </div>
      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {items.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', boxShadow: 'var(--shadow)' }}>
              <div className="event-date-badge" style={{ flexShrink: 0 }}>
                <span>{format(new Date(ev.start_date), 'MMM').toUpperCase()}</span>
                <strong>{format(new Date(ev.start_date), 'd')}</strong>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.2rem' }}>
                  <strong style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)' }}>{ev.title}</strong>
                  {!ev.is_published && <span className="tag">Draft</span>}
                  {ev.is_virtual && <span className="tag gold">Virtual</span>}
                </div>
                <span className="card-meta">{ev.is_virtual ? '🖥 Virtual' : `📍 ${ev.location}`} · 👥 {ev.rsvp_count} RSVPs</span>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => openEdit(ev)}>✏️ Edit</button>
                <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setDeleting(ev)}>🗑️</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="empty">No events yet.</p>}
        </div>
      )}
      {modal && (
        <Modal title={editing ? 'Edit Event' : 'New Event'} onClose={() => setModal(false)}>
          <form onSubmit={submit}>
            <F label="Title *"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></F>
            <F label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <F label="Start Date *"><input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></F>
              <F label="End Date"><input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></F>
            </div>
            <label className="checkbox-label" style={{ marginBottom: '1rem' }}>
              <input type="checkbox" checked={form.is_virtual} onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))} /> Virtual event
            </label>
            {form.is_virtual
              ? <F label="Meeting URL"><input value={form.meeting_url} onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://zoom.us/…" /></F>
              : <F label="Location"><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue and address" /></F>
            }
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <F label="Max RSVPs"><input type="number" min="1" value={form.max_rsvp} onChange={e => setForm(f => ({ ...f, max_rsvp: e.target.value }))} placeholder="Unlimited" /></F>
              <div className="field">
                <label className="checkbox-label"><input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} /> Published</label>
              </div>
            </div>
            <Msg status={status} ok={editing ? 'Event updated!' : 'Event created!'} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>{status === 'submitting' ? 'Saving…' : editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && <Confirm message={`Delete "${deleting.title}"? All RSVPs will be removed.`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

// ─── News ─────────────────────────────────────────────────────────────────────

function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'Community', cover_image: '', is_published: true });

  const load = () => { setLoading(true); api.get('/news').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async e => {
    e.preventDefault(); setStatus('submitting');
    try {
      await api.post('/news', form);
      setStatus('success'); load(); setTimeout(() => setModal(false), 800);
    } catch (err) { setStatus(err.response?.data?.error || 'Failed'); }
  };

  const remove = async () => { await api.delete(`/news/${deleting.id}`).catch(() => {}); setDeleting(null); load(); };

  const CAT_ICONS = { Education: '🎓', Community: '🏘️', Culture: '🎭', Sports: '⚽', Welfare: '❤️', Youth: '🌱', General: '📰' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={() => { setForm({ title: '', excerpt: '', content: '', category: 'Community', cover_image: '', is_published: true }); setStatus(''); setModal(true); }}>
          + New Article
        </button>
      </div>
      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {items.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', boxShadow: 'var(--shadow)' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{CAT_ICONS[n.category] || '📰'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', display: 'block' }}>{n.title}</strong>
                <span className="card-meta">{n.category} · {n.full_name || n.username} · {format(new Date(n.published_at), 'MMM d, yyyy')} · 👁 {n.views || 0}</span>
              </div>
              <button className="btn-ghost" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={() => setDeleting(n)}>🗑️ Delete</button>
            </div>
          ))}
          {items.length === 0 && <p className="empty">No articles yet.</p>}
        </div>
      )}
      {modal && (
        <Modal title="New Article" onClose={() => setModal(false)}>
          <form onSubmit={submit}>
            <F label="Title *"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></F>
            <F label="Excerpt (shown in list)"><textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} placeholder="Short summary…" /></F>
            <F label="Full Content *"><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={8} placeholder="Full article. Blank line = new paragraph." /></F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <F label="Category">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {Object.keys(CAT_ICONS).map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Cover Image URL"><input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://…" /></F>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} /> Publish immediately
            </label>
            <Msg status={status} ok="Article published!" />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>{status === 'submitting' ? 'Publishing…' : 'Publish'}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && <Confirm message={`Permanently delete "${deleting.title}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

// ─── Donations ────────────────────────────────────────────────────────────────

function Donations() {
  const [data, setData] = useState({ donations: [], stats: { total: 0, count: 0 } });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ amount: '', currency: 'GBP', purpose: '', message: '', donor_name: '', is_anonymous: false });

  const load = () => { setLoading(true); api.get('/donations').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async e => {
    e.preventDefault(); setStatus('submitting');
    try {
      await api.post('/donations', form);
      setStatus('success'); load(); setTimeout(() => setModal(false), 900);
    } catch (err) { setStatus(err.response?.data?.error || 'Failed'); }
  };

  const remove = async () => {
    try { await api.delete(`/donations/${deleting.id}`); } catch {}
    setDeleting(null); load();
  };

  const goal = 40000;
  const pct = Math.min(100, Math.round(((data.stats.total || 0) / goal) * 100));

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-box"><strong>£{Number(data.stats.total || 0).toLocaleString()}</strong><span>Total raised</span></div>
        <div className="stat-box"><strong>{data.stats.count}</strong><span>Donations</span></div>
        <div className="stat-box"><strong>{pct}%</strong><span>of £{goal.toLocaleString()} goal</span></div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="donation-goal">
          <span>Community Hall Fund</span>
          <span>£{Number(data.stats.total || 0).toLocaleString()} / £{goal.toLocaleString()}</span>
        </div>
        <div className="donation-progress"><div className="donation-progress-bar" style={{ width: `${pct}%` }} /></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={() => { setForm({ amount: '', currency: 'GBP', purpose: '', message: '', donor_name: '', is_anonymous: false }); setStatus(''); setModal(true); }}>
          + Record Donation
        </button>
      </div>

      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {data.donations.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '.9rem 1.25rem', boxShadow: 'var(--shadow)' }}>
              <div className="member-avatar" style={{ width: 36, height: 36, fontSize: '.88rem', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),#a06818)' }}>
                {d.donor_display[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--earth)' }}>{d.donor_display}</strong>
                {d.purpose && <p style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{d.purpose}</p>}
              </div>
              <span className="donation-amount">£{Number(d.amount).toLocaleString()}</span>
              <span className="card-meta" style={{ flexShrink: 0 }}>{format(new Date(d.created_at), 'MMM d, yyyy')}</span>
              <button className="btn-ghost" style={{ color: 'var(--red)', flexShrink: 0, fontSize: '.78rem' }} onClick={() => setDeleting(d)}>🗑️</button>
            </div>
          ))}
          {data.donations.length === 0 && <p className="empty">No donations recorded yet.</p>}
        </div>
      )}

      {modal && (
        <Modal title="Record Donation" onClose={() => setModal(false)}>
          <p style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.25rem' }}>
            Manually record a cash or bank transfer donation received outside the platform.
          </p>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <F label="Amount *"><input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.00" /></F>
              <F label="Currency">
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option>GBP</option><option>USD</option><option>EUR</option><option>GMD</option>
                </select>
              </F>
            </div>
            <F label="Donor Name (if not anonymous)"><input value={form.donor_name} onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))} placeholder="Full name" /></F>
            <F label="Purpose">
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                <option value="">General Fund</option>
                <option>Community Hall Fund</option>
                <option>Youth Scholarship</option>
                <option>Welfare Fund</option>
                <option>Eid Celebration</option>
                <option>Sports &amp; Activities</option>
              </select>
            </F>
            <F label="Note / Message"><textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={2} /></F>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} /> Anonymous donor
            </label>
            <Msg status={status} ok="Donation recorded!" />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>{status === 'submitting' ? 'Saving…' : 'Record'}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && <Confirm message={`Remove this £${Number(deleting.amount).toLocaleString()} donation from ${deleting.donor_display}?`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────
function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
 
  const load = () => {
    setLoading(true);
    api.get('/admin/members')
      .then(r => { setMembers(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);
 
  const setStatus = async (m, status) => {
    setBusy(m.id);
    try { await api.patch(`/admin/members/${m.id}/status`, { status }); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    setBusy(null);
  };
 
  const setRole = async (m, role) => {
    setBusy(m.id);
    try { await api.patch(`/admin/members/${m.id}/role`, { role }); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    setBusy(null);
  };
 
  const AVATAR_COLORS = [
    'linear-gradient(135deg,#c8902a,#a06818)',
    'linear-gradient(135deg,#2d6a4f,#1a4a35)',
    'linear-gradient(135deg,#7c3aed,#5b21b6)',
    'linear-gradient(135deg,#0369a1,#075985)',
  ];
 
  const STATUS_STYLE = {
    pending:   { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
    approved:  { bg: '#d1fae5', color: '#065f46', label: '✅ Approved' },
    suspended: { bg: '#fee2e2', color: '#991b1b', label: '🚫 Suspended' },
  };
 
  const filtered = members.filter(m => {
    const matchSearch =
      (m.full_name || m.username).toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending'   && m.status === 'pending') ||
      (filter === 'suspended' && m.status === 'suspended') ||
      (filter === 'admin'     && m.role === 'admin');
    return matchSearch && matchFilter;
  });
 
  const counts = {
    pending:   members.filter(m => m.status === 'pending').length,
    suspended: members.filter(m => m.status === 'suspended').length,
  };
 
  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="filter-tabs">
          {[
            ['all',       `All (${members.length})`],
            ['pending',   `⏳ Pending${counts.pending   ? ` (${counts.pending})`   : ''}`],
            ['suspended', `🚫 Suspended${counts.suspended ? ` (${counts.suspended})` : ''}`],
            ['admin',     '⭐ Admins'],
          ].map(([v, l]) => (
            <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <input className="search-input" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
 
      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtered.map((m, i) => {
            const ss = STATUS_STYLE[m.status] || STATUS_STYLE.approved;
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                background: 'var(--white)', border: '1.5px solid var(--cream2)',
                borderRadius: 'var(--radius)', padding: '.9rem 1.25rem', boxShadow: 'var(--shadow)',
                opacity: m.status === 'suspended' ? 0.7 : 1,
              }}>
                <div className="member-avatar" style={{ width: 38, height: 38, fontSize: '.9rem', flexShrink: 0, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {(m.full_name || m.username)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--earth)' }}>{m.full_name || m.username}</strong>
                    <span className={`tag ${m.role === 'admin' ? 'gold' : ''}`}>{m.role === 'admin' ? '⭐ Admin' : m.role}</span>
                    <span style={{ fontSize: '.72rem', padding: '.15rem .5rem', borderRadius: '99px', background: ss.bg, color: ss.color, fontWeight: 600 }}>{ss.label}</span>
                  </div>
                  <p style={{ fontSize: '.75rem', color: 'var(--text3)', margin: '.1rem 0 0' }}>
                    {m.email}
                    {m.location ? ` · 📍 ${m.location}` : ''}
                    {m.last_login ? ` · Last login: ${new Date(m.last_login).toLocaleDateString()}` : ''}
                    {m.login_count ? ` · ${m.login_count} logins` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  {/* Approve button — show for pending/suspended */}
                  {m.status !== 'approved' && (
                    <button className="btn-ghost" style={{ fontSize: '.75rem', color: 'var(--green)' }}
                      disabled={busy === m.id} onClick={() => setStatus(m, 'approved')}>
                      {busy === m.id ? '…' : '✅ Approve'}
                    </button>
                  )}
                  {/* Suspend button — show for approved/pending */}
                  {m.status !== 'suspended' && (
                    <button className="btn-ghost" style={{ fontSize: '.75rem', color: 'var(--red)' }}
                      disabled={busy === m.id} onClick={() => setStatus(m, 'suspended')}>
                      {busy === m.id ? '…' : '🚫 Suspend'}
                    </button>
                  )}
                  {/* Role toggle */}
                  <button className="btn-ghost" style={{ fontSize: '.75rem' }}
                    disabled={busy === m.id}
                    onClick={() => setRole(m, m.role === 'admin' ? 'member' : 'admin')}>
                    {busy === m.id ? '…' : m.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="empty">No members found.</p>}
        </div>
      )}
    </div>
  );
}
 

const TABS = [
  { id: 'dashboard',     label: '📊 Dashboard' },
  { id: 'announcements', label: '📢 Announcements' },
  { id: 'events',        label: '📅 Events' },
  { id: 'news',          label: '📰 News' },
  { id: 'donations',     label: '💰 Donations' },
  { id: 'members',       label: '🤝 Members' },
  { id: 'invite-codes',  label: '🔑 Invite Codes' },
];
 
// ─── Add this line to the tab render section at the bottom of AdminPage ───────
// {tab === 'invite-codes' && <InviteCodes />}
 



export default function AdminPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('dashboard');

  if (user && user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <span className="tag gold">⭐ {user?.full_name || user?.username}</span>
      </div>
      <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', background: 'var(--cream2)', borderRadius: '10px', padding: '4px', marginBottom: '2rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 'fit-content', padding: '.5rem 1rem',
            border: 'none', borderRadius: '7px',
            background: tab === t.id ? 'var(--gold)' : 'transparent',
            color: tab === t.id ? 'var(--white)' : 'var(--text2)',
            fontFamily: 'var(--font-b)', fontSize: '.875rem',
            fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', transition: 'var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'dashboard'     && <Dashboard />}
      {tab === 'announcements' && <Announcements />}
      {tab === 'events'        && <Events />}
      {tab === 'news'          && <News />}
      {tab === 'donations'     && <Donations />}
      {tab === 'members'       && <Members />}
      {tab === 'invite-codes'  && <InviteCodes />}   {/* ← add this */}
    </div>
  );
}

// ─── Invite Codes ─────────────────────────────────────────────────────────────
 
function InviteCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
 
  const load = () => {
    setLoading(true);
    api.get('/admin/invite-codes')
      .then(r => { setCodes(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);
 
  const create = async e => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setCreating(true); setError('');
    try {
      await api.post('/admin/invite-codes', { code: newCode.trim().toUpperCase() });
      setNewCode(''); load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create code');
    }
    setCreating(false);
  };
 
  const toggle = async (code) => {
    try { await api.patch(`/admin/invite-codes/${code.id}/toggle`); load(); }
    catch { alert('Failed'); }
  };
 
  const remove = async (code) => {
    if (!confirm(`Delete code "${code.code}"?`)) return;
    try { await api.delete(`/admin/invite-codes/${code.id}`); load(); }
    catch { alert('Failed'); }
  };
 
  return (
    <div>
      {/* Create new code */}
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', marginBottom: '.75rem' }}>Create New Invite Code</h3>
        <form onSubmit={create} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
            <label>Code</label>
            <input
              value={newCode}
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME2025"
              style={{ letterSpacing: '0.1em', fontFamily: 'monospace', fontWeight: 600 }}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating…' : '+ Create Code'}
          </button>
        </form>
        {error && <p className="form-error" style={{ marginTop: '.5rem' }}>{error}</p>}
      </div>
 
      {/* Code list */}
      {loading ? <p className="empty">Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {codes.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              background: c.is_active ? 'var(--white)' : '#fafafa',
              border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)',
              padding: '.9rem 1.25rem', boxShadow: 'var(--shadow)',
              opacity: c.is_active ? 1 : 0.6,
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--earth)', letterSpacing: '0.1em', flex: 1 }}>
                {c.code}
              </span>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '.72rem', padding: '.15rem .5rem', borderRadius: '99px', fontWeight: 600,
                  background: c.is_active ? '#d1fae5' : '#fee2e2',
                  color: c.is_active ? '#065f46' : '#991b1b',
                }}>
                  {c.is_active ? '✅ Active' : '🚫 Inactive'}
                </span>
                <span className="card-meta">{c.created_by_username ? `Created by ${c.created_by_username}` : 'System'} · {new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                <button className="btn-ghost" style={{ fontSize: '.75rem' }} onClick={() => toggle(c)}>
                  {c.is_active ? '🚫 Deactivate' : '✅ Activate'}
                </button>
                <button className="btn-ghost" style={{ fontSize: '.75rem', color: 'var(--red)' }} onClick={() => remove(c)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {codes.length === 0 && <p className="empty">No invite codes yet.</p>}
        </div>
      )}
    </div>
  );
}
 

 
