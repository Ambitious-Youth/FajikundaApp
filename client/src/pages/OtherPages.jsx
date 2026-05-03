import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '../services/api';

// ─── Announcements ────────────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/announcements')
      .then(r => { setItems(r.data); setLoading(false); })
      .catch(() => { setError('Could not load announcements.'); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? items : items.filter(a => a.priority === filter);
  const pinned = filtered.filter(a => a.is_pinned);
  const rest = filtered.filter(a => !a.is_pinned);
  const [form, setForm] = useState({ amount: '', currency: 'GBP', purpose: '', message: '', donor_name: '', is_anonymous: false });

  return (
    <div className="page">
      <div className="page-header">
        <h1>📢 Announcements</h1>
        <p className="page-subtitle">Stay up to date with community news and notices</p>
      </div>

      <div className="filter-tabs" style={{ marginBottom: '1.5rem' }}>
        {[['all','All'],['urgent','🚨 Urgent'],['high','⚠️ High'],['normal','📋 Normal']].map(([v,l]) => (
          <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius)' }} />)}
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <span>📭</span>
          <p>No announcements yet. Check back soon.</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...pinned, ...rest].map(a => (
            <div key={a.id} style={{
              background: 'var(--white)', borderRadius: 'var(--radius)',
              border: '1.5px solid var(--cream2)',
              borderLeft: `5px solid ${a.priority === 'urgent' ? 'var(--red)' : a.priority === 'high' ? 'var(--gold)' : 'var(--cream3)'}`,
              padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                {a.is_pinned ? <span className="pin-badge">📌 Pinned</span> : null}
                <span className={`priority-badge ${a.priority}`}>{a.priority}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', marginBottom: '.5rem' }}>{a.title}</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: '.75rem' }}>{a.content}</p>
              <span className="card-meta">
                {a.full_name || a.username} · {format(new Date(a.published_at || a.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpd, setRsvpd] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/events')
      .then(r => { setEvents(r.data); setLoading(false); })
      .catch(() => { setError('Could not load events.'); setLoading(false); });
  }, []);

  const rsvp = async (id) => {
    setBusy(id);
    try {
      await api.post(`/events/${id}/rsvp`);
      setRsvpd(r => ({ ...r, [id]: true }));
      setEvents(ev => ev.map(e => e.id === id ? { ...e, rsvp_count: (e.rsvp_count || 0) + 1 } : e));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not RSVP');
    }
    setBusy(null);
  };

  const upcoming = events.filter(e => new Date(e.start_date) >= new Date());
  const past = events.filter(e => new Date(e.start_date) < new Date());

  const EventCard = ({ e }) => (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius)',
      border: '1.5px solid var(--cream2)', boxShadow: 'var(--shadow)',
      overflow: 'hidden', display: 'flex',
    }}>
      <div style={{
        background: 'var(--earth)', minWidth: 72, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '1rem .5rem',
      }}>
        <span style={{ color: 'var(--gold)', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {format(new Date(e.start_date), 'MMM')}
        </span>
        <span style={{ color: 'var(--white)', fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-h)', lineHeight: 1 }}>
          {format(new Date(e.start_date), 'd')}
        </span>
      </div>
      <div style={{ flex: 1, padding: '1.25rem', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.4rem' }}>
          {e.is_virtual && <span className="tag gold">🖥 Virtual</span>}
          {e.max_rsvp && <span className="tag">Max {e.max_rsvp}</span>}
        </div>
        <h3 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', marginBottom: '.4rem' }}>{e.title}</h3>
        {e.description && <p style={{ color: 'var(--text2)', fontSize: '.88rem', marginBottom: '.5rem', lineHeight: 1.6 }}>{e.description}</p>}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="card-meta">
            🕐 {format(new Date(e.start_date), 'h:mm a')} · {e.is_virtual ? `🖥 ${e.meeting_url || 'Online'}` : `📍 ${e.location}`}
          </span>
          <span className="card-meta">👥 {e.rsvp_count || 0} going</span>
        </div>
      </div>
      <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {new Date(e.start_date) >= new Date() ? (
          rsvpd[e.id] ? (
            <span className="tag gold">✅ You're going!</span>
          ) : (
            <button className="btn-primary" style={{ fontSize: '.82rem', padding: '.45rem 1rem' }}
              disabled={busy === e.id} onClick={() => rsvp(e.id)}>
              {busy === e.id ? '…' : 'RSVP'}
            </button>
          )
        ) : (
          <span className="tag" style={{ opacity: .6 }}>Past event</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>📅 Events</h1>
        <p className="page-subtitle">Join us for community gatherings and celebrations</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius)' }} />)}
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className="empty-state"><span>📅</span><p>No events scheduled yet. Check back soon!</p></div>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', fontSize: '1.1rem', marginBottom: '1rem' }}>Upcoming</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '2rem' }}>
            {upcoming.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        </>
      )}

      {!loading && !error && past.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-h)', color: 'var(--text3)', fontSize: '1.1rem', marginBottom: '1rem' }}>Past Events</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', opacity: .7 }}>
            {past.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────

export function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const COLORS = [
    'linear-gradient(135deg,#c8902a,#a06818)',
    'linear-gradient(135deg,#2d6a4f,#1a4a35)',
    'linear-gradient(135deg,#7c3aed,#5b21b6)',
    'linear-gradient(135deg,#0369a1,#075985)',
    'linear-gradient(135deg,#be185d,#9d174d)',
    'linear-gradient(135deg,#b45309,#92400e)',
  ];

  useEffect(() => {
    api.get('/members')
      .then(r => { setMembers(r.data); setLoading(false); })
      .catch(() => { setError('Could not load members.'); setLoading(false); });
  }, []);

  const filtered = members.filter(m =>
    (m.full_name || m.username).toLowerCase().includes(search.toLowerCase()) ||
    (m.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>🤝 Members</h1>
        <p className="page-subtitle">{members.length} members across the diaspora</p>
      </div>

      <input className="search-input" placeholder="🔍 Search by name or location…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '1.5rem', width: '100%', maxWidth: 400 }} />

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius)' }} />)}
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state"><span>🤝</span><p>{search ? 'No members match your search.' : 'No members yet.'}</p></div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem' }}>
          {filtered.map((m, i) => (
            <div key={m.id} style={{
              background: 'var(--white)', borderRadius: 'var(--radius)',
              border: '1.5px solid var(--cream2)', boxShadow: 'var(--shadow)',
              padding: '1.5rem', textAlign: 'center',
            }}>
              <div className="member-avatar" style={{
                width: 56, height: 56, fontSize: '1.3rem', margin: '0 auto .75rem',
                background: m.avatar_url ? 'transparent' : COLORS[i % COLORS.length],
                overflow: 'hidden',
              }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                  : (m.full_name || m.username)[0].toUpperCase()
                }
              </div>
              <h3 style={{ fontFamily: 'var(--font-h)', fontSize: '1rem', color: 'var(--earth)', marginBottom: '.2rem' }}>
                {m.full_name || m.username}
              </h3>
              {m.role === 'admin' && <span className="tag gold" style={{ marginBottom: '.4rem', display: 'inline-block' }}>⭐ <b> Admin </b></span>}
              {m.location && <p className="card-meta">📍 {m.location}</p>}
              {m.bio && <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginTop: '.5rem', lineHeight: 1.5 }}>{m.bio.slice(0, 80)}{m.bio.length > 80 ? '…' : ''}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Donations ────────────────────────────────────────────────────────────────

export function DonationsPage() {
  const [data, setData] = useState({ donations: [], stats: { total: 0, count: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', currency: 'GBP', purpose: '', message: '', is_anonymous: false });
  const [status, setStatus] = useState('');
 
  const GOAL = 40000;
  const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€', GMD: 'D' };
  const fmtAmount = (amount, currency = 'GBP') =>
    `${CURRENCY_SYMBOLS[currency] || currency + ' '}${Number(amount).toLocaleString()}`;
 
  const QUICK_AMOUNTS = ['10', '25', '50', '100'];
 
  useEffect(() => {
    api.get('/donations')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError('Could not load donations.'); setLoading(false); });
  }, []);
 
  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return setStatus('Please enter a valid amount');
    setStatus('submitting');
    try {
      await api.post('/donations', form);
      setStatus('success');
      const r = await api.get('/donations');
      setData(r.data);
      setForm({ amount: '', currency: 'GBP', purpose: '', message: '', is_anonymous: false });
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Could not process donation');
    }
  };
 
  const pct = Math.min(100, Math.round(((data.stats.total || 0) / GOAL) * 100));
  const sym = CURRENCY_SYMBOLS[form.currency] || form.currency;
 
  return (
    <div className="page">
      <div className="page-header">
        <h1>💰 Community Fund</h1>
        <p className="page-subtitle">Every contribution strengthens our community</p>
      </div>
 
      {/* Progress bar */}
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '2rem' }}>
        <div className="donation-goal">
          <span>🏛️ Community Hall Fund</span>
          <span style={{ fontWeight: 600, color: 'var(--gold)' }}>£{Number(data.stats.total || 0).toLocaleString()} / £{GOAL.toLocaleString()}</span>
        </div>
        <div className="donation-progress" style={{ margin: '.75rem 0' }}>
          <div className="donation-progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <span className="card-meta"><strong style={{ color: 'var(--earth)' }}>{pct}%</strong> of goal reached</span>
          <span className="card-meta"><strong style={{ color: 'var(--earth)' }}>{data.stats.count}</strong> donors</span>
        </div>
      </div>

      {/* Add this inside the <form>, before the currency field */}
      <div className="field">
        <label>Your Name</label>
        <input
          value={form.donor_name || ''}
          onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))}
          placeholder="Amara Jallow"
        />
      </div>
 
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Donate form */}
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.2rem', color: 'var(--earth)', marginBottom: '1.25rem' }}>Make a Donation</h2>
          <form onSubmit={submit}>
            {/* Currency selector first so quick amounts show correct symbol */}
            <div className="field">
              <label>Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="GBP">£ GBP — British Pound</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
                <option value="GMD">D GMD — Gambian Dalasi</option>
              </select>
            </div>
            <div className="field">
              <label>Amount</label>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} type="button"
                    className={`btn-outline ${form.amount === a ? 'active' : ''}`}
                    style={{ flex: 1, padding: '.4rem', fontSize: '.85rem' }}
                    onClick={() => setForm(f => ({ ...f, amount: a }))}>
                    {sym}{a}
                  </button>
                ))}
              </div>
              <input type="number" min="1" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={`Or enter amount in ${form.currency}`} />
            </div>
            <div className="field">
              <label>Purpose</label>
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                <option value="">General Fund</option>
                <option>Community Hall Fund</option>
                <option>Youth Scholarship</option>
                <option>Welfare Fund</option>
                <option>Eid Celebration</option>
                <option>Sports &amp; Activities</option>
              </select>
            </div>
            <div className="field">
              <label>Message (optional)</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={2} placeholder="Leave a message of support…" />
            </div>
            <label className="checkbox-label" style={{ marginBottom: '1rem' }}>
              <input type="checkbox" checked={form.is_anonymous}
                onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
              Donate anonymously
            </label>
            {status === 'success' && <p className="form-success">✅ Thank you for your generous donation! 🙏</p>}
            {status && status !== 'success' && status !== 'submitting' && <p className="form-error">{status}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Processing…' : `Donate ${form.amount ? fmtAmount(form.amount, form.currency) : 'Now'}`}
            </button>
          </form>
        </div>
 
        {/* Recent donors */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.2rem', color: 'var(--earth)', marginBottom: '1rem' }}>Recent Donors</h2>
          {loading && [1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius)', marginBottom: '.5rem' }} />
          ))}
          {error && <p className="empty">{error}</p>}
          {!loading && data.donations.length === 0 && (
            <div className="empty-state"><span>💝</span><p>Be the first to donate!</p></div>
          )}
          {!loading && data.donations.map(d => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'var(--white)', border: '1.5px solid var(--cream2)',
              borderRadius: 'var(--radius)', padding: '.9rem 1.25rem',
              boxShadow: 'var(--shadow)', marginBottom: '.5rem',
            }}>
              <div className="member-avatar" style={{
                width: 38, height: 38, fontSize: '.9rem', flexShrink: 0,
                background: 'linear-gradient(135deg,var(--gold),#a06818)',
              }}>
                {(d.donor_display || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--earth)', fontSize: '.9rem' }}>{d.donor_display}</strong>
                {d.purpose && <p style={{ fontSize: '.75rem', color: 'var(--text2)', marginTop: '.1rem' }}>{d.purpose}</p>}
              </div>
              <span className="donation-amount">{fmtAmount(d.amount, d.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// export function DonationsPage() {
//   const [data, setData] = useState({ donations: [], stats: { total: 0, count: 0 } });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [form, setForm] = useState({ amount: '', currency: 'GBP', purpose: '', message: '', donor_name: '', is_anonymous: false });
//   const [status, setStatus] = useState('');

//   const GOAL = 40000;

//   useEffect(() => {
//     api.get('/donations')
//       .then(r => { setData(r.data); setLoading(false); })
//       .catch(() => { setError('Could not load donations.'); setLoading(false); });
//   }, []);

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
//       return setStatus('Please enter a valid amount');
//     setStatus('submitting');
//     try {
//       await api.post('/donations', form);
//       setStatus('success');
//       const r = await api.get('/donations');
//       setData(r.data);
//       setForm({ amount: '', currency: 'GBP', purpose: '', message: '', donor_name: '', is_anonymous: false });
//     } catch (err) {
//       setStatus(err.response?.data?.error || 'Could not process donation');
//     }
//   };

//   const pct = Math.min(100, Math.round(((data.stats.total || 0) / GOAL) * 100));

//   return (
//     <div className="page">
//       <div className="page-header">
//         <h1>💰 Community Fund</h1>
//         <p className="page-subtitle">Every contribution strengthens our community</p>
//       </div>

//       {/* Progress */}
//       <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '2rem' }}>
//         <div className="donation-goal">
//           <span>🏛️ Community Hall Fund</span>
//           <span style={{ fontWeight: 600, color: 'var(--gold)' }}>£{Number(data.stats.total || 0).toLocaleString()} / £{GOAL.toLocaleString()}</span>
//         </div>
//         <div className="donation-progress" style={{ margin: '.75rem 0' }}>
//           <div className="donation-progress-bar" style={{ width: `${pct}%` }} />
//         </div>
//         <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
//           <span className="card-meta"><strong style={{ color: 'var(--earth)' }}>{pct}%</strong> of goal reached</span>
//           <span className="card-meta"><strong style={{ color: 'var(--earth)' }}>{data.stats.count}</strong> donors</span>
//         </div>
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
//         {/* Donate form */}
//         <div style={{ background: 'var(--white)', border: '1.5px solid var(--cream2)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
//           <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.2rem', color: 'var(--earth)', marginBottom: '1.25rem' }}>Make a Donation</h2>
//           <form onSubmit={submit}>
//             <div className="field">
//               <label>Amount</label>
//               <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
//                 {['10','25','50','100'].map(a => (
//                   <button key={a} type="button" className={`btn-outline ${form.amount === a ? 'active' : ''}`}
//                     style={{ flex: 1, padding: '.4rem', fontSize: '.85rem' }}
//                     onClick={() => setForm(f => ({ ...f, amount: a }))}>
//                     £{a}
//                   </button>
//                 ))}
//               </div>
//               <div style={{ display: 'flex', gap: '.5rem' }}>
//                 <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ width: 80 }}>
//                   <option>GBP</option><option>USD</option><option>EUR</option><option>GMD</option>
//                 </select>
//                 <input type="number" min="1" step="0.01" value={form.amount}
//                   onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
//                   placeholder="Or enter amount" style={{ flex: 1 }} />
//               </div>
//             </div>
//             <div className="field">
//               <label>Purpose</label>
//               <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
//                 <option value="">General Fund</option>
//                 <option>Community Hall Fund</option>
//                 <option>Youth Scholarship</option>
//                 <option>Welfare Fund</option>
//                 <option>Eid Celebration</option>
//                 <option>Sports &amp; Activities</option>
//               </select>
//             </div>
//             <div className="field">
//               <label>Message (optional)</label>
//               <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
//                 rows={2} placeholder="Leave a message of support…" />
//             </div>
//             <label className="checkbox-label" style={{ marginBottom: '1rem' }}>
//               <input type="checkbox" checked={form.is_anonymous}
//                 onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
//               Donate anonymously
//             </label>
//             {status === 'success' && <p className="form-success">✅ Thank you for your generous donation! 🙏</p>}
//             {status && status !== 'success' && status !== 'submitting' && <p className="form-error">{status}</p>}
//             <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={status === 'submitting'}>
//               {status === 'submitting' ? 'Processing…' : 'Donate Now'}
//             </button>
//           </form>
//         </div>

//         {/* Recent donors */}
//         <div>
//           <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.2rem', color: 'var(--earth)', marginBottom: '1rem' }}>Recent Donors</h2>
//           {loading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius)', marginBottom: '.5rem' }} />)}
//           {error && <p className="empty">{error}</p>}
//           {!loading && data.donations.length === 0 && (
//             <div className="empty-state"><span>💝</span><p>Be the first to donate!</p></div>
//           )}
//           {!loading && data.donations.map(d => (
//             <div key={d.id} style={{
//               display: 'flex', alignItems: 'center', gap: '1rem',
//               background: 'var(--white)', border: '1.5px solid var(--cream2)',
//               borderRadius: 'var(--radius)', padding: '.9rem 1.25rem',
//               boxShadow: 'var(--shadow)', marginBottom: '.5rem',
//             }}>
//               <div className="member-avatar" style={{ width: 38, height: 38, fontSize: '.9rem', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),#a06818)' }}>
//                 {(d.donor_display || '?')[0].toUpperCase()}
//               </div>
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <strong style={{ color: 'var(--earth)', fontSize: '.9rem' }}>{d.donor_display}</strong>
//                 {d.purpose && <p style={{ fontSize: '.75rem', color: 'var(--text2)', marginTop: '.1rem' }}>{d.purpose}</p>}
//               </div>
//               <span className="donation-amount">£{Number(d.amount).toLocaleString()}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }
