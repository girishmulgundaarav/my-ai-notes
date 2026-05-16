import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, User, LogOut, Settings, Shield } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ user }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { full_name, avatar_url } = user?.user_metadata || {};

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="main-header glass-panel">
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input type="text" placeholder="Search notes..." className="search-input" />
        <div className="ai-badge">
          <Sparkles size={14} />
          <span>AI</span>
        </div>
      </div>
      
      <div className="header-actions" ref={dropdownRef}>
        <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <div className={`profile-img ${isDropdownOpen ? 'active' : ''}`}>
            {avatar_url ? (
              <img src={avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              <User size={20} />
            )}
          </div>
          
          {isDropdownOpen && (
            <div className="profile-dropdown glass-panel fade-in">
              <div className="dropdown-header">
                <span className="user-email">{full_name || user?.email || 'User Account'}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={() => navigate('/account')}>
                <User size={16} />
                <span>My Account</span>
              </button>
              <button className="dropdown-item">
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <button className="dropdown-item">
                <Shield size={16} />
                <span>Privacy</span>
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
