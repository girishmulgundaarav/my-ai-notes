import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  StickyNote, 
  PlusCircle, 
  User, 
  LogOut,
  Cpu,
  X,
  Palette
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'default';
  });

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'default') {
      document.documentElement.className = '';
    } else {
      document.documentElement.className = `theme-${newTheme}`;
    }
  };

  const navItems = [
    { icon: <Home size={20} />, label: 'Home', path: '/home' },
    { icon: <StickyNote size={20} />, label: 'My Notes', path: '/my-notes' },
    { icon: <PlusCircle size={20} />, label: 'Create Note', path: '/create' },
    { icon: <User size={20} />, label: 'Account', path: '/account' },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="sidebar-close-btn" 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'none'
        }}
      >
        <X size={20} />
      </button>
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Cpu size={24} color="white" />
        </div>
        <h2>AI Notes</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="theme-switcher-wrapper" style={{ padding: '0 8px 16px 8px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Palette size={14} style={{ color: 'var(--primary)' }} />
            <span>Theme Skin</span>
          </div>
          <select 
            value={currentTheme} 
            onChange={(e) => handleThemeChange(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 10px', 
              borderRadius: '10px', 
              border: '1px solid rgba(0, 0, 0, 0.08)', 
              background: 'white', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: 'var(--text-main)', 
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <option value="default">✨ Default Lavender</option>
            <option value="nebula">🌌 Midnight Nebula</option>
            <option value="sakura">🌸 Sakura Blossom</option>
            <option value="forest">🌿 Forest Canopy</option>
            <option value="cyberpunk">⚡ Cyberpunk Neon</option>
          </select>
        </div>

        <button className="nav-link sign-out" onClick={handleSignOut}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
