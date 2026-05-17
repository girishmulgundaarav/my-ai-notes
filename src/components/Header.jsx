import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, User, LogOut, Settings, Shield, X, Loader2, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ user, onToggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { full_name } = user?.user_metadata || {};
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const loadAvatar = async () => {
      const path = user?.user_metadata?.avatar_path;
      if (path) {
        const { data } = await supabase.storage.from('app-files').createSignedUrl(path, 3600);
        if (data) setAvatarUrl(data.signedUrl);
      } else if (user?.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
    };
    loadAvatar();
  }, [user]);

  const handleAskAI = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setIsAiModalOpen(true);
      setIsAiLoading(true);
      setAiResponse('');

      try {
        const { data: notes, error } = await supabase
          .from('notes')
          .select('title, content')
          .eq('user_id', user.id);

        if (error) throw error;

        const context = notes.map(n => `Title: ${n.title}\nContent: ${n.content}`).join('\n\n---\n\n');
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        
        if (!apiKey) {
          setAiResponse("Error: OpenAI API key is missing from .env.local");
          setIsAiLoading(false);
          return;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an intelligent assistant. Answer the user's question using the provided notes as your primary source of truth. If the notes do not contain the answer, you may use your general knowledge to provide a helpful answer, but clarify that it is not from their notes. Format your answer nicely with markdown.\n\nHere are the user's notes:\n\n${context}`
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
            temperature: 0.7,
          })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        setAiResponse(data.choices[0].message.content);

      } catch (err) {
        console.error(err);
        setAiResponse("Sorry, I encountered an error while trying to answer your question. Please try again.");
      } finally {
        setIsAiLoading(false);
      }
    }
  };

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
      <button 
        className="mobile-menu-btn" 
        onClick={onToggleSidebar}
        style={{
          display: 'none',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-main)',
          padding: '8px',
          borderRadius: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px'
        }}
      >
        <Menu size={24} />
      </button>
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Ask AI about your notes..." 
          className="search-input" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleAskAI}
        />
        <div className="ai-badge" title="Press Enter to Ask AI">
          <Sparkles size={14} />
          <span>AI</span>
        </div>
      </div>
      
      <div className="header-actions" ref={dropdownRef}>
        <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <div className={`profile-img ${isDropdownOpen ? 'active' : ''}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
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

      {isAiModalOpen && (
        <div className="ai-modal-overlay fade-in" onClick={() => !isAiLoading && setIsAiModalOpen(false)}>
          <div className="ai-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Ask AI</h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setIsAiModalOpen(false)} disabled={isAiLoading}>
                <X size={20} />
              </button>
            </div>
            
            <div className="ai-modal-query">
              <strong>Q:</strong> {searchQuery}
            </div>

            <div className="ai-modal-content-area">
              {isAiLoading ? (
                <div className="ai-loading">
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>Searching your notes...</p>
                </div>
              ) : (
                <div className="markdown-preview" style={{ padding: 0 }}>
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
