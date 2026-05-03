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
    <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: '.6rem' }}>
      {!isOwn && <Avatar user={msg} size={28} />}
      <div style={{ maxWidth: '68%' }}>
        {!isOwn && (
          <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginBottom: '.2rem', paddingLeft: '.25rem' }}>
            {msg.full_name || msg.username}
            {msg.role === 'admin' && <span style={{ marginLeft: '.3rem', color: 'var(--gold)', fontWeight: 700 }}>⭐</span>}
          </div>
        )}
        <div style={{
          background: isOwn ? 'var(--gold)' : 'var(--white)',
          color: isOwn ? '#fff' : 'var(--text)',
          border: isOwn ? 'none' : '1.5px solid var(--cream2)',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '.55rem .9rem', fontSize: '.88rem', lineHeight: 1.5,
          boxShadow: 'var(--shadow)', wordBreak: 'break-word',
        }}>{msg.message}</div>
        <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginTop: '.2rem', textAlign: isOwn ? 'right' : 'left', paddingLeft: isOwn ? 0 : '.25rem' }}>
          {timeStr(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, token } = useAuthStore();
  const [rooms, setRooms]           = useState([]);
  const [members, setMembers]       = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeDM, setActiveDM]     = useState(null);
  const [messages, setMessages]     = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('rooms');
  const [unread, setUnread]         = useState({});

  const activeRoomRef  = useRef(null);
  const activeDMRef    = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout  = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, dmMessages]);

  // Mount socket ONCE — use refs inside handlers to avoid stale closures
  useEffect(() => {
    if (!token || !user) return;
    const socket = connectSocket(token);

    const onOnlineUsers      = (ids) => setOnlineUsers(ids);
    const onNewMessage       = (msg) => {
      if (msg.room_id === activeRoomRef.current?.id)
        setMessages(prev => [...prev, msg]);
    };
    const onNewDM            = (dm) => {
      const otherId = dm.from_id === user.id ? dm.to_id : dm.from_id;
      if (activeDMRef.current?.id === otherId) setDmMessages(prev => [...prev, dm]);
      else setUnread(prev => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
    };
    const onUserTyping       = ({ username, roomId }) => {
      if (roomId === activeRoomRef.current?.id)
        setTyping(prev => prev.includes(username) ? prev : [...prev, username]);
    };
    const onUserStopTyping   = ({ username }) => setTyping(prev => prev.filter(u => u !== username));

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
    setActiveRoom(room);      activeRoomRef.current = room;
    setActiveDM(null);        activeDMRef.current   = null;
    setMessages([]);          setTyping([]);
    socket.emit('join_room', room.id);
    socket.once('room_history', (hist) => setMessages(hist));
  }, []);

  const openDM = async (member) => {
    setActiveDM(member);      activeDMRef.current   = member;
    setActiveRoom(null);      activeRoomRef.current = null;
    setUnread(prev => ({ ...prev, [member.id]: 0 }));
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
    : activeDM ? `💬 ${activeDM.full_name || activeDM.username}` : 'Select a room';

  return (
    <div className="page" style={{ padding: 0, height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, background: 'var(--earth)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.25rem 1rem .75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ color: '#fff', fontFamily: 'var(--font-h)', fontSize: '1.1rem', margin: 0 }}>💬 Community Chat</h2>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {[['rooms','# Rooms'],['members','👥 Members']].map(([v,l]) => (
            <button key={v} onClick={() => setSidebarTab(v)} style={{ flex:1, padding:'.6rem', border:'none', cursor:'pointer', fontSize:'.8rem', fontWeight:600, background: sidebarTab===v?'rgba(255,255,255,0.15)':'transparent', color: sidebarTab===v?'#fff':'rgba(255,255,255,0.55)', transition:'var(--transition)' }}>{l}</button>
          ))}
        </div>

        {sidebarTab === 'rooms' && (
          <div style={{ flex:1, overflowY:'auto', padding:'.5rem 0' }}>
            {rooms.map(room => (
              <button key={room.id} onClick={() => joinRoom(room)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'.6rem', padding:'.6rem 1rem', border:'none', cursor:'pointer', textAlign:'left', background: activeRoom?.id===room.id?'rgba(255,255,255,0.15)':'transparent', color: activeRoom?.id===room.id?'#fff':'rgba(255,255,255,0.65)', transition:'var(--transition)' }}>
                <span>{ROOM_ICONS[room.name]||'💬'}</span>
                <span style={{ fontSize:'.88rem', fontWeight: activeRoom?.id===room.id?600:400 }}>#{room.name}</span>
                {room.type==='admin' && <span style={{ marginLeft:'auto', fontSize:'.65rem', background:'rgba(255,255,255,0.2)', padding:'.1rem .4rem', borderRadius:'99px', color:'#fff' }}>admin</span>}
              </button>
            ))}
          </div>
        )}
        {sidebarTab === 'members' && (
          <div style={{ flex:1, overflowY:'auto', padding:'.5rem 0' }}>
            {members.map(m => (
              <button key={m.id} onClick={() => openDM(m)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'.6rem', padding:'.6rem 1rem', border:'none', cursor:'pointer', textAlign:'left', background: activeDM?.id===m.id?'rgba(255,255,255,0.15)':'transparent', color:'rgba(255,255,255,0.8)', transition:'var(--transition)' }}>
                <div style={{ position:'relative' }}>
                  <Avatar user={m} size={28} />
                  {onlineUsers.includes(m.id) && <div style={{ position:'absolute', bottom:0, right:0, width:8, height:8, borderRadius:'50%', background:'#22c55e', border:'1.5px solid var(--earth)' }} />}
                </div>
                <span style={{ fontSize:'.85rem', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.full_name||m.username}</span>
                {unread[m.id]>0 && <span style={{ background:'var(--gold)', color:'#fff', borderRadius:'99px', fontSize:'.65rem', fontWeight:700, padding:'.1rem .4rem', minWidth:18, textAlign:'center' }}>{unread[m.id]}</span>}
              </button>
            ))}
            {members.length===0 && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.8rem', padding:'1rem', textAlign:'center' }}>No other members</p>}
          </div>
        )}

        <div style={{ padding:'.75rem 1rem', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'.6rem' }}>
          <div style={{ position:'relative' }}>
            <Avatar user={user} size={28} />
            <div style={{ position:'absolute', bottom:0, right:0, width:8, height:8, borderRadius:'50%', background:'#22c55e', border:'1.5px solid var(--earth)' }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontSize:'.8rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name||user?.username}</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'.7rem' }}>{onlineUsers.length} online</div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%', background:'var(--cream)' }}>
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1.5px solid var(--cream2)', background:'var(--white)', display:'flex', alignItems:'center', gap:'.75rem' }}>
          <h3 style={{ fontFamily:'var(--font-h)', color:'var(--earth)', margin:0, fontSize:'1.1rem' }}>{chatTitle}</h3>
          {activeRoom?.description && <span style={{ fontSize:'.78rem', color:'var(--text3)', borderLeft:'1.5px solid var(--cream2)', paddingLeft:'.75rem' }}>{activeRoom.description}</span>}
          {activeDM && <span style={{ marginLeft:'auto', fontSize:'.75rem', color: onlineUsers.includes(activeDM.id)?'#22c55e':'var(--text3)', fontWeight:600 }}>{onlineUsers.includes(activeDM.id)?'🟢 Online':'⚪ Offline'}</span>}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem' }}>
          {currentMessages.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', marginTop:'3rem' }}><div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>💬</div><p>No messages yet. Say hello!</p></div>}
          {currentMessages.map(msg => <Message key={msg.id} msg={msg} isOwn={(msg.user_id||msg.from_id)===user.id} />)}
          {typing.length>0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', color:'var(--text3)', fontSize:'.78rem', padding:'.25rem 0' }}>
              <div style={{ display:'flex', gap:3 }}>{[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text3)', animation:`bounce 1s ease ${i*.2}s infinite` }}/>)}</div>
              {typing.join(', ')} {typing.length===1?'is':'are'} typing…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding:'1rem 1.5rem', borderTop:'1.5px solid var(--cream2)', background:'var(--white)' }}>
          <form onSubmit={send} style={{ display:'flex', gap:'.75rem', alignItems:'center' }}>
            <input value={input} onChange={handleTyping}
              placeholder={activeRoom?`Message #${activeRoom.name}…`:activeDM?`Message ${activeDM.full_name||activeDM.username}…`:'Select a room…'}
              disabled={!activeRoom&&!activeDM}
              style={{ flex:1, padding:'.75rem 1rem', border:'1.5px solid var(--cream2)', borderRadius:'24px', fontSize:'.9rem', outline:'none', background:'var(--cream)', fontFamily:'var(--font-b)' }}
            />
            <button type="submit" disabled={!input.trim()||(!activeRoom&&!activeDM)} style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', background: input.trim()?'var(--gold)':'var(--cream2)', color: input.trim()?'#fff':'var(--text3)', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'var(--transition)', flexShrink:0 }}>➤</button>
          </form>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

export function ChatWidget() {
  const { user, token } = useAuthStore();
  const [open, setOpen]           = useState(false);
  const [rooms, setRooms]         = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
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
    <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:999 }}>
      {open && (
        <div style={{ position:'absolute', bottom:'4rem', right:0, width:340, height:460, background:'var(--white)', borderRadius:'16px', boxShadow:'0 8px 40px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', overflow:'hidden', border:'1.5px solid var(--cream2)' }}>
          <div style={{ background:'var(--earth)', padding:'.75rem 1rem', display:'flex', alignItems:'center' }}>
            <span style={{ color:'#fff', fontWeight:700, fontSize:'.95rem', flex:1 }}>💬 Community Chat</span>
            <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:'1.1rem' }}>×</button>
          </div>
          <div style={{ display:'flex', borderBottom:'1.5px solid var(--cream2)', overflowX:'auto' }}>
            {rooms.map(r=>(
              <button key={r.id} onClick={()=>joinRoom(r)} style={{ padding:'.5rem .75rem', border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:'.75rem', fontWeight: activeRoom?.id===r.id?700:400, background: activeRoom?.id===r.id?'var(--cream)':'transparent', color: activeRoom?.id===r.id?'var(--earth)':'var(--text3)', borderBottom: activeRoom?.id===r.id?'2px solid var(--gold)':'2px solid transparent' }}>
                {ROOM_ICONS[r.name]||'💬'} #{r.name}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'.75rem' }}>
            {messages.map(msg=><Message key={msg.id} msg={msg} isOwn={msg.user_id===user.id}/>)}
            <div ref={messagesEndRef}/>
          </div>
          <form onSubmit={send} style={{ padding:'.6rem', borderTop:'1.5px solid var(--cream2)', display:'flex', gap:'.5rem' }}>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder={`Message #${activeRoom?.name||'…'}`}
              style={{ flex:1, padding:'.5rem .75rem', borderRadius:'99px', border:'1.5px solid var(--cream2)', fontSize:'.85rem', outline:'none', background:'var(--cream)' }}/>
            <button type="submit" disabled={!input.trim()} style={{ width:34, height:34, borderRadius:'50%', border:'none', background: input.trim()?'var(--gold)':'var(--cream2)', color: input.trim()?'#fff':'var(--text3)', cursor:'pointer', fontSize:'.9rem', flexShrink:0 }}>➤</button>
          </form>
        </div>
      )}
      <button onClick={()=>{setOpen(o=>!o);setUnreadCount(0);}} style={{ width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer', background:'var(--earth)', color:'#fff', fontSize:'1.4rem', boxShadow:'0 4px 20px rgba(0,0,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', transition:'var(--transition)', position:'relative' }}>
        {open?'×':'💬'}
        {!open&&unreadCount>0&&<span style={{ position:'absolute', top:-2, right:-2, background:'var(--red)', color:'#fff', borderRadius:'99px', fontSize:'.65rem', fontWeight:700, padding:'.1rem .35rem', minWidth:18, textAlign:'center', border:'2px solid #fff' }}>{unreadCount}</span>}
      </button>
    </div>
  );
}





// import { useEffect, useRef, useState, useCallback } from 'react';
// import { useAuthStore } from '../store/authStore';
// import { connectSocket, getSocket } from '../services/socket';
// import api from '../services/api';

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const AVATAR_COLORS = [
//   'linear-gradient(135deg,#c8902a,#a06818)',
//   'linear-gradient(135deg,#2d6a4f,#1a4a35)',
//   'linear-gradient(135deg,#7c3aed,#5b21b6)',
//   'linear-gradient(135deg,#0369a1,#075985)',
//   'linear-gradient(135deg,#be123c,#9f1239)',
// ];
// const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
// const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// const ROOM_ICONS = { general: '💬', announcements: '📢', events: '📅', admin: '🔒' };

// // ── Avatar ────────────────────────────────────────────────────────────────────
// function Avatar({ user, size = 32 }) {
//   return (
//     <div style={{
//       width: size, height: size, borderRadius: '50%', flexShrink: 0,
//       background: avatarColor(user?.username),
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//       fontSize: size * 0.38, color: '#fff', fontWeight: 700,
//     }}>
//       {user?.avatar_url
//         ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
//         : (user?.full_name || user?.username || '?')[0].toUpperCase()}
//     </div>
//   );
// }

// // ── Message bubble ────────────────────────────────────────────────────────────
// function Message({ msg, isOwn }) {
//   return (
//     <div style={{
//       display: 'flex', gap: '.6rem', alignItems: 'flex-end',
//       flexDirection: isOwn ? 'row-reverse' : 'row',
//       marginBottom: '.6rem',
//     }}>
//       {!isOwn && <Avatar user={msg} size={28} />}
//       <div style={{ maxWidth: '68%' }}>
//         {!isOwn && (
//           <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginBottom: '.2rem', paddingLeft: '.25rem' }}>
//             {msg.full_name || msg.username}
//             {msg.role === 'admin' && <span style={{ marginLeft: '.3rem', color: 'var(--gold)', fontWeight: 700 }}>⭐</span>}
//           </div>
//         )}
//         <div style={{
//           background: isOwn ? 'var(--gold)' : 'var(--white)',
//           color: isOwn ? '#fff' : 'var(--text)',
//           border: isOwn ? 'none' : '1.5px solid var(--cream2)',
//           borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
//           padding: '.55rem .9rem',
//           fontSize: '.88rem',
//           lineHeight: 1.5,
//           boxShadow: 'var(--shadow)',
//           wordBreak: 'break-word',
//         }}>
//           {msg.message}
//         </div>
//         <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginTop: '.2rem', textAlign: isOwn ? 'right' : 'left', paddingLeft: isOwn ? 0 : '.25rem' }}>
//           {timeStr(msg.created_at)}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main ChatPage ─────────────────────────────────────────────────────────────
// export default function ChatPage() {
//   const { user, token } = useAuthStore();
//   const [rooms, setRooms] = useState([]);
//   const [members, setMembers] = useState([]);
//   const [activeRoom, setActiveRoom] = useState(null);
//   const [activeDM, setActiveDM] = useState(null);   // { id, username, full_name }
//   const [messages, setMessages] = useState([]);
//   const [dmMessages, setDmMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [typing, setTyping] = useState([]);
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [sidebarTab, setSidebarTab] = useState('rooms'); // 'rooms' | 'members'
//   const [unread, setUnread] = useState({});
//   const messagesEndRef = useRef(null);
//   const typingTimeout = useRef(null);
//   const activeRoomRef = useRef(null);
//   const activeDMRef = useRef(null);
//   const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   useEffect(scrollToBottom, [messages, dmMessages]);

//   // ── Connect socket ──────────────────────────────────────────
//   useEffect(() => {
//     if (!token) return;
//     const socket = connectSocket(token);

//     socket.on('online_users', setOnlineUsers);
//     socket.on('new_message', (msg) => {
//       if (msg.room_id === activeRoom?.id) {
//         setMessages(prev => [...prev, msg]);
//       }
//     });
//     socket.on('new_dm', (dm) => {
//       const otherId = dm.from_id === user.id ? dm.to_id : dm.from_id;
//       if (activeDM?.id === otherId) {
//         setDmMessages(prev => [...prev, dm]);
//       } else {
//         setUnread(prev => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
//       }
//     });
//     socket.on('user_typing', ({ username, roomId }) => {
//       if (roomId === activeRoom?.id)
//         setTyping(prev => prev.includes(username) ? prev : [...prev, username]);
//     });
//     socket.on('user_stop_typing', ({ username }) => {
//       setTyping(prev => prev.filter(u => u !== username));
//     });

//     return () => {
//       socket.off('online_users');
//       socket.off('new_message');
//       socket.off('new_dm');
//       socket.off('user_typing');
//       socket.off('user_stop_typing');
//     };
//   }, [token, activeRoom, activeDM, user]);

//   // ── Load rooms & members ────────────────────────────────────
//   useEffect(() => {
//     api.get('/chat/rooms').then(r => {
//       setRooms(r.data);
//       if (r.data.length) joinRoom(r.data[0]);
//     });
//     api.get('/admin/members').then(r =>
//       setMembers(r.data.filter(m => m.id !== user.id && m.status === 'approved'))
//     ).catch(() =>
//       api.get('/members').then(r => setMembers(r.data.filter(m => m.id !== user.id)))
//     );
//     api.get('/chat/unread').then(r => {
//       // unread count total — individual tracking happens via new_dm event
//     });
//   }, []);

//   // ── Join room ───────────────────────────────────────────────
//   const joinRoom = useCallback((room) => {
//     const socket = getSocket();
//     if (!socket) return;
//     setActiveRoom(room);
//     setActiveDM(null);
//     setMessages([]);
//     socket.emit('join_room', room.id);
//     socket.once('room_history', setMessages);
//   }, []);

//   // ── Open DM ─────────────────────────────────────────────────
//   const openDM = async (member) => {
//     setActiveDM(member);
//     setActiveRoom(null);
//     activeDMRef.current = member;
//     activeRoomRef.current = room;
//     setUnread(prev => ({ ...prev, [member.id]: 0 }));
//     const { data } = await api.get(`/chat/dms/${member.id}`);
//     setDmMessages(data);
//   };

//   // ── Send message ────────────────────────────────────────────
//   const send = (e) => {
//     e.preventDefault();
//     if (!input.trim()) return;
//     const socket = getSocket();
//     if (activeRoom) {
//       socket.emit('send_message', { roomId: activeRoom.id, message: input.trim() });
//     } else if (activeDM) {
//       socket.emit('send_dm', { toId: activeDM.id, message: input.trim() });
//     }
//     setInput('');
//     if (typingTimeout.current) clearTimeout(typingTimeout.current);
//     if (activeRoom) socket.emit('stop_typing', { roomId: activeRoom.id });
//   };

//   // ── Typing indicator ────────────────────────────────────────
//   const handleTyping = (e) => {
//     setInput(e.target.value);
//     if (!activeRoom) return;
//     const socket = getSocket();
//     socket.emit('typing', { roomId: activeRoom.id });
//     if (typingTimeout.current) clearTimeout(typingTimeout.current);
//     typingTimeout.current = setTimeout(() => {
//       socket.emit('stop_typing', { roomId: activeRoom.id });
//     }, 2000);
//   };

//   const currentMessages = activeRoom ? messages : dmMessages;
//   const chatTitle = activeRoom
//     ? `${ROOM_ICONS[activeRoom.name] || '💬'} #${activeRoom.name}`
//     : activeDM ? `💬 ${activeDM.full_name || activeDM.username}` : 'Select a room';
  
//   return (
//     <div className="page" style={{ padding: 0, height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>

//       {/* ── Sidebar ── */}
//       <div style={{
//         width: 260, flexShrink: 0, background: 'var(--earth)',
//         display: 'flex', flexDirection: 'column', height: '100%',
//       }}>
//         {/* Sidebar header */}
//         <div style={{ padding: '1.25rem 1rem .75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
//           <h2 style={{ color: '#fff', fontFamily: 'var(--font-h)', fontSize: '1.1rem', margin: 0 }}>💬 Community Chat</h2>
//         </div>

//         {/* Sidebar tabs */}
//         <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
//           {[['rooms', '# Rooms'], ['members', '👥 Members']].map(([v, l]) => (
//             <button key={v} onClick={() => setSidebarTab(v)} style={{
//               flex: 1, padding: '.6rem', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600,
//               background: sidebarTab === v ? 'rgba(255,255,255,0.15)' : 'transparent',
//               color: sidebarTab === v ? '#fff' : 'rgba(255,255,255,0.55)',
//               transition: 'var(--transition)',
//             }}>{l}</button>
//           ))}
//         </div>

//         {/* Rooms list */}
//         {sidebarTab === 'rooms' && (
//           <div style={{ flex: 1, overflowY: 'auto', padding: '.5rem 0' }}>
//             {rooms.map(room => (
//               <button key={room.id} onClick={() => joinRoom(room)} style={{
//                 width: '100%', display: 'flex', alignItems: 'center', gap: '.6rem',
//                 padding: '.6rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
//                 background: activeRoom?.id === room.id ? 'rgba(255,255,255,0.15)' : 'transparent',
//                 color: activeRoom?.id === room.id ? '#fff' : 'rgba(255,255,255,0.65)',
//                 transition: 'var(--transition)',
//               }}>
//                 <span style={{ fontSize: '1rem' }}>{ROOM_ICONS[room.name] || '💬'}</span>
//                 <span style={{ fontSize: '.88rem', fontWeight: activeRoom?.id === room.id ? 600 : 400 }}>
//                   #{room.name}
//                 </span>
//                 {room.type === 'admin' && (
//                   <span style={{ marginLeft: 'auto', fontSize: '.65rem', background: 'rgba(255,255,255,0.2)', padding: '.1rem .4rem', borderRadius: '99px', color: '#fff' }}>
//                     admin
//                   </span>
//                 )}
//               </button>
//             ))}
//           </div>
//         )}

//         {/* Members list */}
//         {sidebarTab === 'members' && (
//           <div style={{ flex: 1, overflowY: 'auto', padding: '.5rem 0' }}>
//             {members.map(m => (
//               <button key={m.id} onClick={() => openDM(m)} style={{
//                 width: '100%', display: 'flex', alignItems: 'center', gap: '.6rem',
//                 padding: '.6rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
//                 background: activeDM?.id === m.id ? 'rgba(255,255,255,0.15)' : 'transparent',
//                 color: 'rgba(255,255,255,0.8)', transition: 'var(--transition)',
//               }}>
//                 <div style={{ position: 'relative' }}>
//                   <Avatar user={m} size={28} />
//                   {onlineUsers.includes(m.id) && (
//                     <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1.5px solid var(--earth)' }} />
//                   )}
//                 </div>
//                 <span style={{ fontSize: '.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                   {m.full_name || m.username}
//                 </span>
//                 {unread[m.id] > 0 && (
//                   <span style={{ background: 'var(--gold)', color: '#fff', borderRadius: '99px', fontSize: '.65rem', fontWeight: 700, padding: '.1rem .4rem', minWidth: 18, textAlign: 'center' }}>
//                     {unread[m.id]}
//                   </span>
//                 )}
//               </button>
//             ))}
//             {members.length === 0 && (
//               <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.8rem', padding: '1rem', textAlign: 'center' }}>No members online</p>
//             )}
//           </div>
//         )}

//         {/* Current user */}
//         <div style={{ padding: '.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
//           <div style={{ position: 'relative' }}>
//             <Avatar user={user} size={28} />
//             <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1.5px solid var(--earth)' }} />
//           </div>
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{ color: '#fff', fontSize: '.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//               {user?.full_name || user?.username}
//             </div>
//             <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.7rem' }}>
//               {onlineUsers.length} online
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Main chat area ── */}
//       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)' }}>

//         {/* Chat header */}
//         <div style={{
//           padding: '1rem 1.5rem', borderBottom: '1.5px solid var(--cream2)',
//           background: 'var(--white)', display: 'flex', alignItems: 'center', gap: '.75rem',
//         }}>
//           <h3 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', margin: 0, fontSize: '1.1rem' }}>
//             {chatTitle}
//           </h3>
//           {activeRoom?.description && (
//             <span style={{ fontSize: '.78rem', color: 'var(--text3)', borderLeft: '1.5px solid var(--cream2)', paddingLeft: '.75rem' }}>
//               {activeRoom.description}
//             </span>
//           )}
//           {activeDM && (
//             <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: onlineUsers.includes(activeDM.id) ? '#22c55e' : 'var(--text3)', fontWeight: 600 }}>
//               {onlineUsers.includes(activeDM.id) ? '🟢 Online' : '⚪ Offline'}
//             </span>
//           )}
//         </div>

//         {/* Messages */}
//         <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
//           {currentMessages.length === 0 && (
//             <div style={{ textAlign: 'center', color: 'var(--text3)', marginTop: '3rem' }}>
//               <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>💬</div>
//               <p style={{ fontSize: '.9rem' }}>No messages yet. Say hello!</p>
//             </div>
//           )}
//           {currentMessages.map(msg => (
//             <Message
//               key={msg.id}
//               msg={msg}
//               isOwn={(msg.user_id || msg.from_id) === user.id}
//             />
//           ))}
//           {/* Typing indicator */}
//           {typing.length > 0 && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.25rem 0', color: 'var(--text3)', fontSize: '.78rem' }}>
//               <div style={{ display: 'flex', gap: 3 }}>
//                 {[0,1,2].map(i => (
//                   <div key={i} style={{
//                     width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)',
//                     animation: `bounce 1s ease ${i * 0.2}s infinite`,
//                   }} />
//                 ))}
//               </div>
//               {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…
//             </div>
//           )}
//           <div ref={messagesEndRef} />
//         </div>

//         {/* Input */}
//         <div style={{ padding: '1rem 1.5rem', borderTop: '1.5px solid var(--cream2)', background: 'var(--white)' }}>
//           <form onSubmit={send} style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
//             <input
//               value={input}
//               onChange={handleTyping}
//               placeholder={activeRoom ? `Message #${activeRoom.name}…` : activeDM ? `Message ${activeDM.full_name || activeDM.username}…` : 'Select a room to chat…'}
//               disabled={!activeRoom && !activeDM}
//               style={{
//                 flex: 1, padding: '.75rem 1rem', border: '1.5px solid var(--cream2)',
//                 borderRadius: '24px', fontSize: '.9rem', outline: 'none',
//                 background: 'var(--cream)', fontFamily: 'var(--font-b)',
//               }}
//             />
//             <button type="submit" disabled={!input.trim() || (!activeRoom && !activeDM)} style={{
//               width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
//               background: input.trim() ? 'var(--gold)' : 'var(--cream2)',
//               color: input.trim() ? '#fff' : 'var(--text3)',
//               fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
//               transition: 'var(--transition)', flexShrink: 0,
//             }}>
//               ➤
//             </button>
//           </form>
//         </div>
//       </div>

//       <style>{`
//         @keyframes bounce {
//           0%, 60%, 100% { transform: translateY(0); }
//           30% { transform: translateY(-6px); }
//         }
//       `}</style>
//     </div>
//   );
// }

// // ── Floating Chat Widget ──────────────────────────────────────────────────────
// export function ChatWidget() {
//   const { user, token } = useAuthStore();
//   const [open, setOpen] = useState(false);
//   const [rooms, setRooms] = useState([]);
//   const [activeRoom, setActiveRoom] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [unreadCount, setUnreadCount] = useState(0);
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     if (!token) return;
//     connectSocket(token);
//     api.get('/chat/unread').then(r => setUnreadCount(r.data.count)).catch(() => {});
//     api.get('/chat/rooms').then(r => {
//       setRooms(r.data);
//       if (r.data.length) joinRoom(r.data[0]);
//     }).catch(() => {});
//   }, [token]);

//   useEffect(() => {
//     const socket = getSocket();
//     if (!socket) return;
//     const handler = (msg) => {
//       if (msg.room_id === activeRoom?.id) setMessages(prev => [...prev, msg]);
//       else if (!open) setUnreadCount(c => c + 1);
//     };
//     socket.on('new_message', handler);
//     return () => socket.off('new_message', handler);
//   }, [activeRoom, open]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, open]);

//   const joinRoom = (room) => {
//     const socket = getSocket();
//     if (!socket) return;
//     setActiveRoom(room);
//     setMessages([]);
//     socket.emit('join_room', room.id);
//     socket.once('room_history', (hist) => setMessages(hist.slice(-20)));
//   };

//   const send = (e) => {
//     e.preventDefault();
//     if (!input.trim() || !activeRoom) return;
//     getSocket()?.emit('send_message', { roomId: activeRoom.id, message: input.trim() });
//     setInput('');
//   };

//   const handleOpen = () => {
//     setOpen(o => !o);
//     setUnreadCount(0);
//   };

//   if (!user) return null;

//   return (
//     <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999 }}>
//       {/* Chat panel */}
//       {open && (
//         <div style={{
//           position: 'absolute', bottom: '4rem', right: 0,
//           width: 340, height: 460, background: 'var(--white)',
//           borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
//           display: 'flex', flexDirection: 'column', overflow: 'hidden',
//           border: '1.5px solid var(--cream2)', animation: 'fadeUp .2s ease',
//         }}>
//           {/* Header */}
//           <div style={{ background: 'var(--earth)', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
//             <span style={{ color: '#fff', fontWeight: 700, fontSize: '.95rem', flex: 1 }}>💬 Community Chat</span>
//             <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
//           </div>

//           {/* Room tabs */}
//           <div style={{ display: 'flex', borderBottom: '1.5px solid var(--cream2)', overflowX: 'auto' }}>
//             {rooms.map(r => (
//               <button key={r.id} onClick={() => joinRoom(r)} style={{
//                 padding: '.5rem .75rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
//                 fontSize: '.75rem', fontWeight: activeRoom?.id === r.id ? 700 : 400,
//                 background: activeRoom?.id === r.id ? 'var(--cream)' : 'transparent',
//                 color: activeRoom?.id === r.id ? 'var(--earth)' : 'var(--text3)',
//                 borderBottom: activeRoom?.id === r.id ? '2px solid var(--gold)' : '2px solid transparent',
//               }}>
//                 {ROOM_ICONS[r.name] || '💬'} #{r.name}
//               </button>
//             ))}
//           </div>

//           {/* Messages */}
//           <div style={{ flex: 1, overflowY: 'auto', padding: '.75rem' }}>
//             {messages.map(msg => (
//               <Message key={msg.id} msg={msg} isOwn={msg.user_id === user.id} />
//             ))}
//             <div ref={messagesEndRef} />
//           </div>

//           {/* Input */}
//           <form onSubmit={send} style={{ padding: '.6rem', borderTop: '1.5px solid var(--cream2)', display: 'flex', gap: '.5rem' }}>
//             <input
//               value={input}
//               onChange={e => setInput(e.target.value)}
//               placeholder={`Message #${activeRoom?.name || '…'}`}
//               style={{ flex: 1, padding: '.5rem .75rem', borderRadius: '99px', border: '1.5px solid var(--cream2)', fontSize: '.85rem', outline: 'none', background: 'var(--cream)' }}
//             />
//             <button type="submit" disabled={!input.trim()} style={{
//               width: 34, height: 34, borderRadius: '50%', border: 'none',
//               background: input.trim() ? 'var(--gold)' : 'var(--cream2)',
//               color: input.trim() ? '#fff' : 'var(--text3)',
//               cursor: 'pointer', fontSize: '.9rem', flexShrink: 0,
//             }}>➤</button>
//           </form>
//         </div>
//       )}

//       {/* Toggle bubble */}
//       <button onClick={handleOpen} style={{
//         width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
//         background: 'var(--earth)', color: '#fff', fontSize: '1.4rem',
//         boxShadow: '0 4px 20px rgba(0,0,0,0.25)', display: 'flex',
//         alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)',
//         position: 'relative',
//       }}>
//         {open ? '×' : '💬'}
//         {!open && unreadCount > 0 && (
//           <span style={{
//             position: 'absolute', top: -2, right: -2,
//             background: 'var(--red)', color: '#fff',
//             borderRadius: '99px', fontSize: '.65rem', fontWeight: 700,
//             padding: '.1rem .35rem', minWidth: 18, textAlign: 'center',
//             border: '2px solid #fff',
//           }}>
//             {unreadCount}
//           </span>
//         )}
//       </button>
//     </div>
//   );
// }
