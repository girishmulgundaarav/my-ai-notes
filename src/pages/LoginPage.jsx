import React, { useState } from 'react';
import { Mail, Lock, Command, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        navigate('/confirm-email');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate('/home');
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/home'
      }
    });
    if (error) setError(error.message);
  };

  return (
    <div className="login-page">
      <div className="login-card glass-panel fade-in">
        <div className="login-header">
          <div className="login-logo">
            <Command size={32} color="white" />
          </div>
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access your AI workspace.</p>
        </div>

        <form className="login-form" onSubmit={handleSignIn}>
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              placeholder="name@example.com" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input 
              type="password" 
              placeholder="Enter your password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button className="btn btn-secondary google-btn" onClick={handleGoogleSignIn}>
          <img src="https://www.google.com/favicon.ico" alt="Google" width="18" height="18" />
          Continue with Google
        </button>

        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
