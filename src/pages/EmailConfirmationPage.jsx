import React from 'react';
import { Mail, ArrowLeft, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const EmailConfirmationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-card glass-panel fade-in">
        <div className="login-header">
          <div className="login-logo" style={{ background: 'var(--accent)' }}>
            <Mail size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Email Not Confirmed</h1>
          <p style={{ marginTop: '16px', lineHeight: '1.6' }}>
            It looks like you haven't confirmed your email address yet. 
            Please check your inbox and click the confirmation link to activate your account.
          </p>
        </div>

        <div className="confirmation-actions" style={{ marginTop: '32px' }}>
          <button 
            className="btn btn-primary login-btn" 
            style={{ width: '100%', display: 'flex', gap: '10px' }}
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={18} />
            Back to Sign In
          </button>
        </div>

        <p className="signup-link" style={{ marginTop: '32px', fontSize: '0.85rem' }}>
          Didn't receive the email? <a href="#" style={{ color: 'var(--primary)', fontWeight: '600' }}>Resend Link</a>
        </p>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;
