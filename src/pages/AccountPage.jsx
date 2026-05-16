import React from 'react';
import { User, Mail, Shield, LogOut, Camera } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css'; // Reusing some glassmorphic styles

const AccountPage = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const { full_name, avatar_url } = user?.user_metadata || {};

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="account-page fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="account-card glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="profile-header" style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
          {avatar_url ? (
            <img 
              src={avatar_url} 
              alt="Profile" 
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: 'var(--glass-shadow)' }} 
            />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', align_items: 'center', justifyContent: 'center', border: '4px solid white', boxShadow: 'var(--glass-shadow)' }}>
              <User size={64} />
            </div>
          )}
          <button style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Camera size={18} />
          </button>
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{full_name || 'User Account'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Manage your account settings and preferences.</p>

        <div className="account-details" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="detail-item glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Mail className="detail-icon" size={24} style={{ color: 'var(--primary)' }} />
            <div className="detail-info">
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Email Address</span>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.email}</p>
            </div>
          </div>

          <div className="detail-item glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Shield className="detail-icon" size={24} style={{ color: 'var(--accent)' }} />
            <div className="detail-info">
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Account Security</span>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.app_metadata?.provider === 'google' ? 'Connected via Google' : 'Email/Password Authentication'}</p>
            </div>
          </div>
        </div>

        <button 
          className="btn btn-ghost logout-btn" 
          style={{ marginTop: '40px', color: '#ef4444', display: 'flex', gap: '10px', margin: '40px auto 0' }}
          onClick={handleSignOut}
        >
          <LogOut size={20} />
          Sign Out of AI Notes
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
