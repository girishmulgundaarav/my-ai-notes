import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  Tag, 
  Sparkles,
  Trash2,
  Edit2,
  Calendar,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MyNotesPage.css';

const MyNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userInitials, setUserInitials] = useState('ME');
  const navigate = useNavigate();

  const categories = ['All', 'General', 'Work', 'Personal', 'Ideas'];

  // Color mapping for categories
  const categoryColors = {
    General: { bg: '#e0f2fe', text: '#0369a1', border: '#0ea5e9' },
    Work: { bg: '#e0e7ff', text: '#4338ca', border: '#6366f1' },
    Personal: { bg: '#dcfce7', text: '#15803d', border: '#22c55e' },
    Ideas: { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' },
    Default: { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email || 'User';
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        setUserInitials(initials);
        
        const path = user.user_metadata?.avatar_path;
        if (path) {
          const { data } = await supabase.storage.from('app-files').createSignedUrl(path, 3600);
          if (data) setAvatarUrl(data.signedUrl);
        } else if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        }
      }
    };
    loadUser();
    fetchNotes();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const notesWithUrls = await Promise.all(
        data.map(async (note) => {
          if (note.cover_image_path) {
            const { data: urlData, error: urlError } = await supabase.storage
              .from('app-files')
              .createSignedUrl(note.cover_image_path, 3600);
            if (!urlError && urlData) {
              return { ...note, cover_image_url: urlData.signedUrl };
            }
          }
          return note;
        })
      );
      
      setNotes(notesWithUrls);
    } catch (error) {
      console.error('Error fetching notes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const noteToDelete = notes.find(note => note.id === id);
      if (noteToDelete) {
        const filesToDelete = [];
        if (noteToDelete.cover_image_path) {
          filesToDelete.push(noteToDelete.cover_image_path);
        }
        if (noteToDelete.attachments && noteToDelete.attachments.length > 0) {
          noteToDelete.attachments.forEach(att => {
            if (att.path) filesToDelete.push(att.path);
          });
        }
        
        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('app-files')
            .remove(filesToDelete);
          if (storageError) {
            console.error('Error removing note files from storage:', storageError.message);
          }
        }
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      alert('Error deleting note: ' + error.message);
    }
  };

  const stripMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/[*_]{1,3}/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[#\-]/g, '');
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || note.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="my-notes-page fade-in">
      <header className="page-header">
        <div className="header-info">
          <h1>My Notes</h1>
          <p>You have {notes.length} total notes.</p>
        </div>
        <Link to="/create" className="btn btn-primary">
          <Plus size={18} />
          Create New Note
        </Link>
      </header>

      <div className="notes-controls">
        <div className="search-bar glass-panel">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search your notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {categories.map(tab => (
            <button 
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading your notes...</div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => {
            const colors = categoryColors[note.category] || categoryColors.Default;
            return (
              <div 
                key={note.id} 
                className="note-card glass-panel" 
                onClick={() => navigate(`/note/${note.id}?mode=view`)}
                style={{ 
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Note Top Card Area (Image or Placeholder) */}
                <div style={{ height: '180px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                  {note.cover_image_url ? (
                    <img 
                      src={note.cover_image_url} 
                      alt="Cover" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(241, 245, 249, 0.4)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={48} color="#cbd5e1" />
                    </div>
                  )}
                  {/* Floating Date Pill */}
                  <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'white', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'var(--glass-shadow)', fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>
                    <Calendar size={12} />
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>

                <div className="note-card-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <div className="note-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="category-tag" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      <Tag size={12} />
                      {note.category}
                    </span>
                    <div className="note-actions">
                      <button 
                        className="action-btn edit" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/note/${note.id}?mode=edit`);
                        }}
                        style={{ marginRight: '8px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="action-btn delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>{note.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, flex: 1 }}>{stripMarkdown(note.content)?.substring(0, 100)}...</p>
                  
                  <div className="note-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(0, 0, 0, 0.05)', marginTop: 'auto' }}>
                    <div className="note-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Avatar" 
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>
                          {userInitials}
                        </div>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Edited just now</span>
                    </div>
                    
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Open <ArrowUpRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && !loading && (
            <div className="empty-state glass-panel">
              <p>No notes found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyNotesPage;
