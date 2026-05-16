import React, { useState } from 'react';
import { Mail, Lock, Command, User, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/LoginPage.css'; // Reusing login styles for consistency

const SignUpPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    console.log("Sign Up Response:", { data, error });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Supabase sends a confirmation email by default
      alert('Check your email for confirmation link!');
      navigate('/login');
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
          <h1>Create Account</h1>
          <p>Sign up to start your AI-powered journey.</p>
        </div>

        <form className="login-form" onSubmit={handleSignUp}>
          <div className="input-group">
            <User className="input-icon" size={20} />
            <input 
              type="text" 
              placeholder="Full Name" 
              className="input-field" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Create a password" 
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

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
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
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
