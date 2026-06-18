import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import HomePage from './pages/HomePage';
import MyNotesPage from './pages/MyNotesPage';
import CreateNotePage from './pages/CreateNotePage';
import EmailConfirmationPage from './pages/EmailConfirmationPage';
import AccountPage from './pages/AccountPage';
import HabitsPage from './pages/HabitsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { supabase } from './supabaseClient';

const Layout = ({ children, session }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(3px)',
            zIndex: 99,
            display: 'none'
          }}
        />
      )}
      <div className="main-content">
        <Header user={session?.user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
                 (localStorage.getItem('mock_session') === 'true' || window.location.search.includes('mock_session=true'))) {
        setSession({
          user: {
            id: 'da39a3ee-5e6b-4b0d-9b1e-123456789abc',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test Developer'
            }
          }
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
                 localStorage.getItem('mock_session') === 'true') {
        // Keep mock session active if flagged
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/home" />} />
        <Route path="/signup" element={!session ? <SignUpPage /> : <Navigate to="/home" />} />
        <Route path="/confirm-email" element={<EmailConfirmationPage />} />
        
        <Route path="/" element={<Navigate to="/home" />} />
        
        <Route 
          path="/home" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><HomePage userName={session?.user?.user_metadata?.full_name} /></Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-notes" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><MyNotesPage /></Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><CreateNotePage /></Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/note/:id" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><CreateNotePage /></Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><AccountPage session={session} /></Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/habits" 
          element={
            <ProtectedRoute session={session}>
              <Layout session={session}><HabitsPage /></Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
