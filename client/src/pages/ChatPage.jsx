import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { connectSocket, getSocket } from '../services/socket';
import api from '../services/api';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#c8902a,#a06818)',
  'linear-gradient(135deg,#2d6a4f,#1a4a35)',
  'linear-gradient(135deg,#7c3aed,#5b21b6)',
  'linear-gradient(135deg,#0369a1,#075985)',
  'linear-gradient(135deg,#be123c,#9f1239)',
];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const ROOM_ICONS = { general: '💬', announcements: '📢', events: '📅', admin: '🔒' };

function Avatar({ user, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarColor(user?.username),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, color: '#fff', fontWeight: 700, overflow: 'hidden',
    }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : (user?.full_name || user?.username || '?')[0].toUpperCase()}
    </div>
  );
}

function Message({ msg, isOwn }) {
  return (
    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: '.5rem' }}>
      {!isOwn && <Avatar user={msg} size={26} />}
      <div style={{ maxWidth: '75%' }}>
        {!isOwn && (
          <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginBottom: '.15rem', paddingLeft: '.25rem' }}>
            {msg.full_name || msg.username}
            {msg.role === 'admin' && <span style={{ marginLeft: '.3rem', color: 'var(--gold)', fontWeight: 700 }}>⭐</span>}
          </div>
        )}
        <div style={{
          background: isOwn ? 'var(--gold)' : 'var(--white)',
          color: isOwn ? '#fff' : 'var(--text)',
          border: isOwn ? 'none' : '1.5px solid var(--cream2)',
          borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '.5rem .85rem', fontSize: '.88rem', lineHeight: 1.5,
          boxShadow: 'var(--shadow)', wordBreak: 'break-word',
        }}>{msg.message}</div>
        <div style={{ fontSize: '.63rem', color: 'var(--text3)', marginTop: '.15rem', textAlign: isOwn ? 'right' : 'left', paddingLeft: isOwn ? 0 : '.25rem' }}>
          {timeStr(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, token } = useAuthStore();
  const [rooms, setRooms]             = useState([]);
  const [members, setMembers]         = useState([]);
  const [activeRoom, setActiveRoom]   = useState(null);
  const [activeDM, setActiveDM]       = useState(null);
  const [messages, setMessages]       = useState([]);
  const [dmMessages, setDmMessages]   = useState([]);
  const [input, setInput]             = useState('');
  const [typing, setTyping]           = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarTab, setSidebarTab]   = useState('rooms');
  const [unread, setUnread]           = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeRoomRef  = useRef(null);
  const activeDMRef    = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout  = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, dmMessages]);

  // Socket — mount once
  useEffect(() => {
    if (!token || !user) return;
    const socket = connectSocket(token);
    const onOnlineUsers     = (ids) => setOnlineUsers(ids);
    const onNewMessage      = (msg) => {
      if (msg.room_id === activeRoomRef.current?.id) setMessages(prev => [...prev, msg]);
    };
    const onNewDM           = (dm) => {
      const otherId = dm.from_id === user.id ? dm.to_id : dm.from_id;
      if (activeDMRef.current?.id === otherId) setDmMessages(prev => [...prev, dm]);
      else setUnread(prev => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
    };
    const onUserTyping      = ({ username, roomId }) => {
      if (roomId === activeRoomRef.current?.id)
        setTyping(prev => prev.includes(username) ? prev : [...prev, username]);
    };
    const onUserStopTyping  = ({ username }) => setTyping(prev => prev.filter(u => u !== username));

    socket.on('online_users',     onOnlineUsers);
    socket.on('new_message',      onNewMessage);
    socket.on('new_dm',           onNewDM);
    socket.on('user_typing',      onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);
    socket.emit('get_online_users');

    return () => {
      socket.off('online_users',     onOnlineUsers);
      socket.off('new_message',      onNewMessage);
      socket.off('new_dm',           onNewDM);
      socket.off('user_typing',      onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
    };
  }, [token, user]);

  useEffect(() => {
    api.get('/chat/rooms').then(r => { setRooms(r.data); if (r.data.length) joinRoom(r.data[0]); });
    api.get('/members').then(r => setMembers(r.data.filter(m => m.id !== user.id))).catch(() => {});
  }, []);

  const joinRoom = useCallback((room) => {
    const socket = getSocket();
    if (!socket) return;
    setActiveRoom(room);    activeRoomRef.current = room;
    setActiveDM(null);      activeDMRef.current   = null;
    setMessages([]);        setTyping([]);
    setSidebarOpen(false);
    socket.emit('join_room', room.id);
    socket.once('room_history', (hist) => setMessages(hist));
  }, []);

  const openDM = async (member) => {
    setActiveDM(member);    activeDMRef.current   = member;
    setActiveRoom(null);    activeRoomRef.current = null;
    setUnread(prev => ({ ...prev, [member.id]: 0 }));
    setSidebarOpen(false);
    const { data } = await api.get(`/chat/dms/${member.id}`);
    setDmMessages(data);
  };

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const socket = getSocket();
    if (activeRoomRef.current)  socket.emit('send_message', { roomId: activeRoomRef.current.id, message: input.trim() });
    else if (activeDMRef.current) socket.emit('send_dm', { toId: activeDMRef.current.id, message: input.trim() });
    setInput('');
    inputRef.current?.focus();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (activeRoomRef.current) socket.emit('stop_typing', { roomId: activeRoomRef.current.id });
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!activeRoomRef.current) return;
    const socket = getSocket();
    socket.emit('typing', { roomId: activeRoomRef.current.id });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('stop_typing', { roomId: activeRoomRef.current.id }), 2000);
  };

  const currentMessages = activeRoom ? messages : dmMessages;
  const chatTitle = activeRoom
    ? `${ROOM_ICONS[activeRoom.name] || '💬'} #${activeRoom.name}`
    : activeDM ? `${activeDM.full_name || activeDM.username}` : 'Select a room';
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const SidebarContent = () => (
    <>
      <div style={{ padding: '1rem 1rem .6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <h2 style={{ color: '#fff', fontFamily: 'var(--font-h)', fontSize: '1rem', margin: 0 }}>💬 Community Chat</h2>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {[['rooms','# Rooms'],['members','👥 Members']].map(([v,l]) => (
          <button key={v} onClick={() => setSidebarTab(v)} style={{ flex:1, padding:'.55rem', border:'none', cursor:'pointer', fontSize:'.78rem', fontWeight:600, background: sidebarTab===v?'rgba(255,255,255,0.15)':'transparent', color: sidebarTab===v?'#fff':'rgba(255,255,255,0.55)', transition:'var(--transition)' }}>{l}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {sidebarTab === 'rooms' && rooms.map(room => (
          <button key={room.id} onClick={() => joinRoom(room)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'.6rem', padding:'.65rem 1rem', border:'none', cursor:'pointer', textAlign:'left', background: activeRoom?.id===room.id?'rgba(255,255,255,0.15)':'transparent', color: activeRoom?.id===room.id?'#fff':'rgba(255,255,255,0.65)', transition:'var(--transition)' }}>
            <span style={{ fontSize:'.95rem' }}>{ROOM_ICONS[room.name]||'💬'}</span>
            <span style={{ fontSize:'.88rem', fontWeight: activeRoom?.id===room.id?600:400, flex:1, textAlign:'left' }}>#{room.name}</span>
            {room.type==='admin' && <span style={{ fontSize:'.65rem', background:'rgba(255,255,255,0.2)', padding:'.1rem .4rem', borderRadius:'99px', color:'#fff' }}>admin</span>}
          </button>
        ))}
        {sidebarTab === 'members' && (
          <>
            {members.map(m => (
              <button key={m.id} onClick={() => openDM(m)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'.6rem', padding:'.65rem 1rem', border:'none', cursor:'pointer', textAlign:'left', background: activeDM?.id===m.id?'rgba(255,255,255,0.15)':'transparent', color:'rgba(255,255,255,0.8)', transition:'var(--transition)' }}>
                <div style={{ position:'relative' }}>
                  <Avatar user={m} size={28} />
                  {onlineUsers.includes(m.id) && <div style={{ position:'absolute', bottom:0, right:0, width:8, height:8, borderRadius:'50%', background:'#22c55e', border:'1.5px solid var(--earth)' }} />}
                </div>
                <span style={{ fontSize:'.85rem', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'left' }}>{m.full_name||m.username}</span>
                {unread[m.id]>0 && <span style={{ background:'var(--gold)', color:'#fff', borderRadius:'99px', fontSize:'.65rem', fontWeight:700, padding:'.1rem .4rem', minWidth:18, textAlign:'center' }}>{unread[m.id]}</span>}
              </button>
            ))}
            {members.length===0 && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.8rem', padding:'1rem', textAlign:'center' }}>No other members</p>}
          </>
        )}
      </div>
      <div style={{ padding:'.65rem 1rem', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'.6rem', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <Avatar user={user} size={26} />
          <div style={{ position:'absolute', bottom:0, right:0, width:7, height:7, borderRadius:'50%', background:'#22c55e', border:'1.5px solid var(--earth)' }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:'#fff', fontSize:'.78rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name||user?.username}</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'.68rem' }}>{onlineUsers.length} online</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="chat-layout">
      {/* Desktop sidebar */}
      <div className="chat-sidebar">
        <SidebarContent />
      </div>

      {/* Mobile sidebar backdrop */}
      <div className={`chat-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Mobile sidebar drawer */}
      <div className={`chat-sidebar`} style={{ display: 'none' }} />
      {/* We use a separate mobile drawer below */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--earth)',
        borderRadius: '16px 16px 0 0',
        maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .3s ease',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.3)',
      }} className="mobile-only-drawer">
        <div style={{ width:40, height:4, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'.75rem auto .5rem', flexShrink:0 }} onClick={() => setSidebarOpen(false)} />
        <SidebarContent />
      </div>
      {sidebarOpen && <div style={{ position:'fixed', inset:0, zIndex:199, background:'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} className="mobile-only-backdrop" />}

      {/* Main chat area */}
      <div className="chat-main">
        {/* Header */}
        <div style={{ padding:'.75rem 1rem', borderBottom:'1.5px solid var(--cream2)', background:'var(--white)', display:'flex', alignItems:'center', gap:'.6rem', flexShrink:0 }}>
          <h3 style={{ fontFamily:'var(--font-h)', color:'var(--earth)', margin:0, fontSize:'1rem', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chatTitle}</h3>
          {activeDM && <span style={{ fontSize:'.75rem', color: onlineUsers.includes(activeDM.id)?'#22c55e':'var(--text3)', fontWeight:600, flexShrink:0 }}>{onlineUsers.includes(activeDM.id)?'🟢':'⚪'}</span>}
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'.875rem 1rem', WebkitOverflowScrolling:'touch' }}>
          {currentMessages.length===0 && (
            <div style={{ textAlign:'center', color:'var(--text3)', marginTop:'3rem' }}>
              <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>💬</div>
              <p style={{ fontSize:'.88rem' }}>No messages yet. Say hello!</p>
            </div>
          )}
          {currentMessages.map(msg => <Message key={msg.id} msg={msg} isOwn={(msg.user_id||msg.from_id)===user.id} />)}
          {typing.length>0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', color:'var(--text3)', fontSize:'.75rem', padding:'.2rem 0' }}>
              <div style={{ display:'flex', gap:3 }}>{[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'var(--text3)', animation:`bounce 1s ease ${i*.2}s infinite` }}/>)}</div>
              {typing.join(', ')} typing…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'.75rem 1rem', borderTop:'1.5px solid var(--cream2)', background:'var(--white)', flexShrink:0 }}>
          <form onSubmit={send} style={{ display:'flex', gap:'.6rem', alignItems:'center' }}>
            <input ref={inputRef} value={input} onChange={handleTyping}
              placeholder={activeRoom?`#${activeRoom.name}…`:activeDM?`${activeDM.full_name||activeDM.username}…`:'Select a room…'}
              disabled={!activeRoom&&!activeDM}
              style={{ flex:1, padding:'.65rem .9rem', border:'1.5px solid var(--cream2)', borderRadius:'24px', fontSize:'.95rem', outline:'none', background:'var(--cream)', fontFamily:'var(--font-b)', minWidth:0 }}
            />
            <button type="submit" disabled={!input.trim()||(!activeRoom&&!activeDM)} style={{ width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer', background: input.trim()?'var(--gold)':'var(--cream2)', color: input.trim()?'#fff':'var(--text3)', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'var(--transition)', flexShrink:0 }}>➤</button>
          </form>
        </div>

        {/* Mobile bottom toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:'.5rem', padding:'.55rem .875rem', background:'var(--earth)', borderTop:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }} className="chat-mobile-toolbar-inner">
          <button onClick={() => { setSidebarTab('rooms'); setSidebarOpen(true); }} style={{ background: 'rgba(255,255,255,0.12)', border:'none', borderRadius:8, color:'rgba(255,255,255,0.85)', padding:'.4rem .875rem', fontSize:'.78rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'.35rem' }}>
            # Rooms
          </button>
          <button onClick={() => { setSidebarTab('members'); setSidebarOpen(true); }} style={{ background: 'rgba(255,255,255,0.12)', border:'none', borderRadius:8, color:'rgba(255,255,255,0.85)', padding:'.4rem .875rem', fontSize:'.78rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'.35rem' }}>
            👥 Members {totalUnread>0&&<span style={{ background:'var(--gold)', color:'#fff', borderRadius:'99px', fontSize:'.6rem', fontWeight:700, padding:'0 .35rem', minWidth:16, textAlign:'center' }}>{totalUnread}</span>}
          </button>
          <div style={{ flex:1 }} />
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'.72rem' }}>{onlineUsers.length} 🟢</div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @media (min-width: 768px) {
          .mobile-only-drawer { display: none !important; }
          .mobile-only-backdrop { display: none !important; }
          .chat-mobile-toolbar-inner { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Floating Chat Widget ──────────────────────────────────────────────────────
export function ChatWidget() {
  const { user, token } = useAuthStore();
  const [open, setOpen]             = useState(false);
  const [rooms, setRooms]           = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const activeRoomRef  = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, open]);

  useEffect(() => {
    if (!token||!user) return;
    const socket = connectSocket(token);
    const onNewMessage = (msg) => {
      if (msg.room_id===activeRoomRef.current?.id) setMessages(prev=>[...prev,msg]);
      else setUnreadCount(c=>c+1);
    };
    socket.on('new_message', onNewMessage);
    return () => socket.off('new_message', onNewMessage);
  }, [token, user]);

  useEffect(() => {
    if (!token) return;
    api.get('/chat/rooms').then(r => { setRooms(r.data); if (r.data.length) joinRoom(r.data[0]); }).catch(()=>{});
    api.get('/chat/unread').then(r => setUnreadCount(r.data.count)).catch(()=>{});
  }, [token]);

  const joinRoom = (room) => {
    const socket = getSocket();
    if (!socket) return;
    setActiveRoom(room); activeRoomRef.current = room;
    setMessages([]);
    socket.emit('join_room', room.id);
    socket.once('room_history', (hist) => setMessages(hist.slice(-30)));
  };

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()||!activeRoomRef.current) return;
    getSocket()?.emit('send_message', { roomId: activeRoomRef.current.id, message: input.trim() });
    setInput('');
  };

  if (!user) return null;

  return (
    <div style={{ position:'fixed', bottom:'1.25rem', right:'1.25rem', zIndex:998 }}>
      {open && (
        <div style={{ position:'absolute', bottom:'4rem', right:0, width:'min(340px, calc(100vw - 2.5rem))', height:440, background:'var(--white)', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', overflow:'hidden', border:'1.5px solid var(--cream2)' }}>
          <div style={{ background:'var(--earth)', padding:'.7rem 1rem', display:'flex', alignItems:'center' }}>
            <span style={{ color:'#fff', fontWeight:700, fontSize:'.9rem', flex:1 }}>💬 Community Chat</span>
            <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:'1.2rem', lineHeight:1 }}>×</button>
          </div>
          <div style={{ display:'flex', borderBottom:'1.5px solid var(--cream2)', overflowX:'auto' }}>
            {rooms.map(r=>(
              <button key={r.id} onClick={()=>joinRoom(r)} style={{ padding:'.45rem .7rem', border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:'.75rem', fontWeight: activeRoom?.id===r.id?700:400, background: activeRoom?.id===r.id?'var(--cream)':'transparent', color: activeRoom?.id===r.id?'var(--earth)':'var(--text3)', borderBottom: activeRoom?.id===r.id?'2px solid var(--gold)':'2px solid transparent' }}>
                {ROOM_ICONS[r.name]||'💬'} #{r.name}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'.75rem', WebkitOverflowScrolling:'touch' }}>
            {messages.map(msg=><Message key={msg.id} msg={msg} isOwn={msg.user_id===user.id}/>)}
            <div ref={messagesEndRef}/>
          </div>
          <form onSubmit={send} style={{ padding:'.6rem', borderTop:'1.5px solid var(--cream2)', display:'flex', gap:'.5rem' }}>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder={`Message #${activeRoom?.name||'…'}`}
              style={{ flex:1, padding:'.5rem .75rem', borderRadius:'99px', border:'1.5px solid var(--cream2)', fontSize:'.88rem', outline:'none', background:'var(--cream)', minWidth:0 }}/>
            <button type="submit" disabled={!input.trim()} style={{ width:34, height:34, borderRadius:'50%', border:'none', background: input.trim()?'var(--gold)':'var(--cream2)', color: input.trim()?'#fff':'var(--text3)', cursor:'pointer', fontSize:'.9rem', flexShrink:0 }}>➤</button>
          </form>
        </div>
      )}
      <button onClick={()=>{setOpen(o=>!o);setUnreadCount(0);}} style={{ width:50, height:50, borderRadius:'50%', border:'none', cursor:'pointer', background:'var(--earth)', color:'#fff', fontSize:'1.3rem', boxShadow:'0 4px 20px rgba(0,0,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', transition:'var(--transition)', position:'relative' }}>
        {open?'×':'💬'}
        {!open&&unreadCount>0&&<span style={{ position:'absolute', top:-2, right:-2, background:'var(--red)', color:'#fff', borderRadius:'99px', fontSize:'.6rem', fontWeight:700, padding:'.1rem .3rem', minWidth:17, textAlign:'center', border:'2px solid #fff' }}>{unreadCount}</span>}
      </button>
    </div>
  );
}
