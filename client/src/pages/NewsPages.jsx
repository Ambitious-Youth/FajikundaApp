import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';

const CAT_ICONS = { Education:'🎓', Community:'🏘️', Culture:'🎭', Sports:'⚽', Welfare:'❤️', Youth:'🌱', General:'📰', general:'📰' };

// ─── News List ────────────────────────────────────────────────────────────────

export function NewsListPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/news')
      .then(r => { setArticles(r.data); setLoading(false); })
      .catch(() => { setError('Could not load news.'); setLoading(false); });
  }, []);

  const categories = ['all', ...Array.from(new Set(articles.map(a => a.category).filter(Boolean)))];

  const filtered = articles.filter(a => {
    const matchCat = category === 'all' || a.category === category;
    const matchSearch = !search || (a.title + ' ' + (a.excerpt || '')).toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="page">
      <div className="page-header">
        <h1>📰 Community News</h1>
        <p className="page-subtitle">Stories and updates from across the diaspora</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div className="filter-tabs" style={{ flex: 1, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
              {c === 'all' ? '📰 All' : `${CAT_ICONS[c] || '📰'} ${c}`}
            </button>
          ))}
        </div>
        <input className="search-input" placeholder="🔍 Search articles…"
          value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius)' }} />)}
          </div>
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state"><span>📭</span><p>{search || category !== 'all' ? 'No articles match your filter.' : 'No articles published yet.'}</p></div>
      )}

      {/* Featured */}
      {!loading && featured && (
        <Link to={`/news/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
          <div style={{
            background: featured.cover_image ? `linear-gradient(to bottom, rgba(26,18,9,0.3), rgba(26,18,9,0.85)), url(${featured.cover_image}) center/cover` : 'var(--earth)',
            borderRadius: 'var(--radius)', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-lg)',
            color: 'var(--cream)', minHeight: 200,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.5rem' }}>
              {CAT_ICONS[featured.category] || '📰'} {featured.category} · Featured
            </span>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.5rem', color: 'var(--white)', marginBottom: '.5rem' }}>{featured.title}</h2>
            {featured.excerpt && <p style={{ color: 'rgba(245,239,227,0.75)', fontSize: '.9rem', lineHeight: 1.6 }}>{featured.excerpt}</p>}
            <span style={{ fontSize: '.78rem', color: 'rgba(245,239,227,0.55)', marginTop: '.5rem' }}>
              {featured.full_name || featured.username} · {format(new Date(featured.published_at), 'MMM d, yyyy')} · 👁 {featured.views || 0}
            </span>
          </div>
        </Link>
      )}

      {/* Grid */}
      {!loading && rest.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.25rem' }}>
          {rest.map(a => (
            <Link key={a.id} to={`/news/${a.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--white)', borderRadius: 'var(--radius)',
                border: '1.5px solid var(--cream2)', boxShadow: 'var(--shadow)',
                overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                {a.cover_image && (
                  <div style={{ height: 120, background: `url(${a.cover_image}) center/cover`, flexShrink: 0 }} />
                )}
                <div style={{ padding: '1.25rem', flex: 1 }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {CAT_ICONS[a.category] || '📰'} {a.category}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', margin: '.4rem 0 .5rem', fontSize: '1rem', lineHeight: 1.4 }}>{a.title}</h3>
                  {a.excerpt && <p style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>{a.excerpt.slice(0, 100)}{a.excerpt.length > 100 ? '…' : ''}</p>}
                </div>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <span className="card-meta">{format(new Date(a.published_at), 'MMM d, yyyy')} · 👁 {a.views || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── News Detail ──────────────────────────────────────────────────────────────

export function NewsDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/news/${slug}`)
      .then(r => { setArticle(r.data); setLoading(false); })
      .catch(() => { setError('Article not found.'); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="skeleton" style={{ height: 32, width: '60%', borderRadius: 8, marginBottom: '1rem' }} />
      <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 8, marginBottom: '2rem' }} />
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 14, borderRadius: 8, marginBottom: '.75rem', width: i === 4 ? '70%' : '100%' }} />)}
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="empty-state"><span>📭</span><p>{error}</p></div>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/news" className="btn-outline">← Back to News</Link>
      </div>
    </div>
  );

  if (!article) return null;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Link to="/news" style={{ color: 'var(--gold)', fontSize: '.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginBottom: '1.5rem' }}>
        ← Back to News
      </Link>

      {article.cover_image && (
        <div style={{ height: 280, borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1.5rem', background: `url(${article.cover_image}) center/cover` }} />
      )}

      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {CAT_ICONS[article.category] || '📰'} {article.category}
      </span>

      <h1 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', fontSize: '2rem', lineHeight: 1.3, margin: '.5rem 0 1rem' }}>
        {article.title}
      </h1>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--cream2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <div className="member-avatar" style={{ width: 36, height: 36, fontSize: '.85rem', background: 'linear-gradient(135deg,var(--gold),#a06818)', flexShrink: 0 }}>
            {(article.full_name || article.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--earth)', fontSize: '.88rem', margin: 0 }}>{article.full_name || article.username}</p>
            <p className="card-meta" style={{ margin: 0 }}>{format(new Date(article.published_at), 'MMMM d, yyyy')}</p>
          </div>
        </div>
        <span className="card-meta" style={{ marginLeft: 'auto' }}>👁 {article.views || 0} views</span>
      </div>

      <div style={{ lineHeight: 1.9, color: 'var(--text)', fontSize: '1rem' }}>
        {(article.content || '').split('\n\n').map((para, i) => (
          para.trim() ? <p key={i} style={{ marginBottom: '1.25rem' }}>{para.trim()}</p> : null
        ))}
      </div>
    </div>
  );
}
