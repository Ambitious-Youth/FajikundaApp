import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/layout/Navbar';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import { AnnouncementsPage, EventsPage, MembersPage, DonationsPage } from './pages/OtherPages';
import { NewsListPage, NewsDetailPage } from './pages/NewsPages';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages';
import ChatPage, { ChatWidget } from './pages/ChatPage';
import './styles.css';

function PrivateRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="splash"><div className="splash-icon">🌍</div></div>;
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="splash"><div className="splash-icon">🌍</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
      <ChatWidget />
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/logo.png" alt="Fajikunda Logo" className="footer-logo" />
            <div>
              <strong>The Gambian Fajikunda Society In Diaspora</strong>
              <p>Together We Grow, Together We Rise.</p>
            </div>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} Fajikunda Diaspora Society. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes — no layout */}
        <Route path="/login"           element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Public routes — with layout, no login required */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/news" element={<Layout><NewsListPage /></Layout>} />
        <Route path="/news/:slug" element={<Layout><NewsDetailPage /></Layout>} />
        <Route path="/donations" element={<Layout><DonationsPage /></Layout>} />

        {/* Protected routes — login required */}
        <Route path="/*" element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/events"        element={<EventsPage />} />
                <Route path="/members"       element={<MembersPage />} />
                <Route path="/profile"       element={<ProfilePage />} />
                <Route path="/chat"          element={<ChatPage />} />
                <Route path="/admin"         element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="*"              element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}




// import { useEffect } from 'react';
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { useAuthStore } from './store/authStore';
// import Navbar from './components/layout/Navbar';
// import AuthPage from './pages/AuthPage';
// import Home from './pages/Home';
// import { AnnouncementsPage, EventsPage, MembersPage, DonationsPage } from './pages/OtherPages';
// import { NewsListPage, NewsDetailPage } from './pages/NewsPages';
// import AdminPage from './pages/AdminPage';
// import ProfilePage from './pages/ProfilePage';
// import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages';
// import './styles.css';

// function PrivateRoute({ children }) {
//   const { token, loading } = useAuthStore();
//   if (loading) return <div className="splash"><div className="splash-icon">🌍</div></div>;
//   return token ? children : <Navigate to="/login" replace />;
// }

// function AdminRoute({ children }) {
//   const { user, loading } = useAuthStore();
//   if (loading) return <div className="splash"><div className="splash-icon">🌍</div></div>;
//   if (!user) return <Navigate to="/login" replace />;
//   if (user.role !== 'admin') return <Navigate to="/" replace />;
//   return children;
// }

// function Layout({ children }) {
//   return (
//     <>
//       <Navbar />
//       <main className="main-content">{children}</main>
//       <footer className="footer">
//         <div className="footer-inner">
//           <div className="footer-brand">
//             <img src="/logo.png" alt="Fajikunda Logo" className="footer-logo" />
//             <div>
//               <strong>The Gambian Fajikunda Society In Diaspora</strong>
//               <p>Together We Grow, Together We Rise.</p>
//             </div>
//           </div>
//           <p className="footer-copy">© {new Date().getFullYear()} Fajikunda Diaspora Society. All rights reserved.</p>
//         </div>
//       </footer>
//     </>
//   );
// }

// export default function App() {
//   const { init } = useAuthStore();
//   useEffect(() => { init(); }, []);

//   return (
//     <BrowserRouter>
//       <Routes>
//         {/* Auth routes — no layout */}
//         <Route path="/login"           element={<AuthPage />} />
//         <Route path="/forgot-password" element={<ForgotPasswordPage />} />
//         <Route path="/reset-password"  element={<ResetPasswordPage />} />

//         {/* Public routes — with layout, no login required */}
//         <Route path="/" element={<Layout><Home /></Layout>} />
//         <Route path="/news" element={<Layout><NewsListPage /></Layout>} />
//         <Route path="/news/:slug" element={<Layout><NewsDetailPage /></Layout>} />
//         <Route path="/donations" element={<Layout><DonationsPage /></Layout>} />

//         {/* Protected routes — login required */}
//         <Route path="/*" element={
//           <PrivateRoute>
//             <Layout>
//               <Routes>
//                 <Route path="/announcements" element={<AnnouncementsPage />} />
//                 <Route path="/events"        element={<EventsPage />} />
//                 <Route path="/members"       element={<MembersPage />} />
//                 <Route path="/profile"       element={<ProfilePage />} />
//                 <Route path="/admin"         element={<AdminRoute><AdminPage /></AdminRoute>} />
//                 <Route path="*"              element={<Navigate to="/" replace />} />
//               </Routes>
//             </Layout>
//           </PrivateRoute>
//         } />
//       </Routes>
//     </BrowserRouter>
//   );
// }





