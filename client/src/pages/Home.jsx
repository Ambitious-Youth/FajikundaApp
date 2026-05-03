import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { format } from 'date-fns';

export default function Home() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(r.data.slice(0, 3))).catch(()=>{});
    api.get('/events').then(r => setEvents(r.data.slice(0, 3))).catch(()=>{});
    api.get('/news?limit=3').then(r => setNews(r.data)).catch(()=>{});
  }, []);

  return (
    <div className="page home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
  <img src="/logo.png" alt="Fajikunda Logo" className="hero-logo" />
  <p className="hero-eyebrow">Welcome back, {user?.full_name || user?.username} 👋</p>
  <h1>Your Community,<br />Wherever You Are</h1>
          <p className="hero-sub">Stay connected with Fajikunda — news, events, announcements and people that matter.</p>
          <div className="hero-actions">
            <Link to="/events" className="btn-primary">Upcoming Events</Link>
            <Link to="/members" className="btn-outline">Meet Members</Link>
          </div>
        </div>
        <div className="hero-pattern" aria-hidden />
      </section>

      {/* Pinned Announcements */}
      {announcements.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2>📢 Announcements</h2>
            <Link to="/announcements">See all →</Link>
          </div>
          <div className="card-grid">
            {announcements.map(a => (
              <div key={a.id} className={`announce-card priority-${a.priority}`}>
                {a.is_pinned && <span className="pin-badge">📌 Pinned</span>}
                <h3>{a.title}</h3>
                <p>{a.content.slice(0, 120)}{a.content.length > 120 ? '…' : ''}</p>
                <span className="card-meta">{format(new Date(a.published_at), 'MMM d, yyyy')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2>📅 Upcoming Events</h2>
            <Link to="/events">See all →</Link>
          </div>
          <div className="card-grid">
            {events.map(e => (
              <Link to={`/events`} key={e.id} className="event-card">
                <div className="event-date-badge">
                  <span>{format(new Date(e.start_date), 'MMM').toUpperCase()}</span>
                  <strong>{format(new Date(e.start_date), 'd')}</strong>
                </div>
                <div className="event-info">
                  <h3>{e.title}</h3>
                  <p>{e.is_virtual ? '🖥 Virtual' : `📍 ${e.location}`}</p>
                  <span>{e.rsvp_count} going</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* News */}
      {news.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2>📰 Latest News</h2>
            <Link to="/news">See all →</Link>
          </div>
          <div className="card-grid">
            {news.map(n => (
              <Link to={`/news/${n.slug}`} key={n.id} className="news-card">
                {n.cover_image && <img src={n.cover_image} alt={n.title} className="news-thumb" />}
                <div className="news-body">
                  <span className="news-cat">{n.category}</span>
                  <h3>{n.title}</h3>
                  <p>{n.excerpt?.slice(0, 100)}</p>
                  <span className="card-meta">{n.full_name || n.username} · {format(new Date(n.published_at), 'MMM d')}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}





