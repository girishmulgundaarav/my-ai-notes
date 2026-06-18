import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  StickyNote, 
  PlusCircle, 
  User, 
  LogOut,
  Cpu,
  X,
  Trophy
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const navItems = [
    { icon: <Home size={20} />, label: 'Home', path: '/home' },
    { icon: <StickyNote size={20} />, label: 'My Notes', path: '/my-notes' },
    { icon: <PlusCircle size={20} />, label: 'Create Note', path: '/create' },
    { icon: <Trophy size={20} />, label: 'Habits', path: '/habits' },
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
        <button className="nav-link sign-out" onClick={handleSignOut}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
