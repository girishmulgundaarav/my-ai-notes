import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  Tag, 
  Sparkles,
  Trash2,
  Edit2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MyNotesPage.css';

const MyNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
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
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
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
                  borderLeft: `6px solid ${colors.border}` 
                }}
              >
                <div className="note-card-header">
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
                <h3>{note.title}</h3>
                <p>{stripMarkdown(note.content)?.substring(0, 100)}...</p>
                <div className="note-card-footer">
                  <div className="note-meta">
                    <Clock size={14} />
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                  {note.is_ai_enhanced && (
                    <div className="ai-status">
                      <Sparkles size={14} />
                      <span>Enhanced</span>
                    </div>
                  )}
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
