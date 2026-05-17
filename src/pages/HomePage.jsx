import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  PenTool, 
  Loader2, 
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabaseClient';
import '../styles/HomePage.css';

const HomePage = ({ userName }) => {
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [totalWords, setTotalWords] = useState(0);
  const [aiBoostCount, setAiBoostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Quick Capture State
  const [quickText, setQuickText] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // AI Assistant State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all notes to calculate statistics
      const { data: allNotes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;

      // Calculate total stats
      setTotalNotes(allNotes.length);
      
      let words = 0;
      let enhancedCount = 0;
      allNotes.forEach(note => {
        if (note.content) {
          words += note.content.trim().split(/\s+/).filter(Boolean).length;
          // Simple count for enhanced notes: if it has cover, attachments or markdown styling
          if (note.cover_image_path || (note.attachments && note.attachments.length > 0) || note.content.includes('#') || note.content.includes('**')) {
            enhancedCount++;
          }
        }
      });
      setTotalWords(words);
      setAiBoostCount(enhancedCount);

      // 2. Fetch top 3 recently edited notes with signed cover URLs
      const top3 = allNotes.slice(0, 3);
      const resolvedTop3 = await Promise.all(top3.map(async (note) => {
        let coverUrl = null;
        if (note.cover_image_path) {
          const { data } = await supabase.storage
            .from('app-files')
            .createSignedUrl(note.cover_image_path, 3600);
          if (data) coverUrl = data.signedUrl;
        }
        return {
          ...note,
          coverUrl
        };
      }));
      setRecentNotes(resolvedTop3);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickCapture = async () => {
    if (!quickText.trim()) return;
    setIsSavingQuick(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote = {
        title: `Quick Capture (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
        content: quickText,
        category: 'General',
        user_id: user.id
      };

      const { error } = await supabase
        .from('notes')
        .insert(newNote);

      if (error) throw error;
      setQuickText('');
      await loadDashboardData();
    } catch (error) {
      alert('Error saving quick draft: ' + error.message);
    } finally {
      setIsSavingQuick(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
              content: `You are an intelligent assistant. Answer the user's question using their notes as your primary source of truth. Format your answer with high-quality markdown. If they have no notes or no answers exist there, let them know nicely but still answer based on general knowledge.`
            },
            {
              role: 'user',
              content: `Here are my notes:\n\n${context}\n\nQuestion: ${aiQuery}`
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
  };

  return (
    <div className="home-page fade-in">
      <section className="welcome-section glass-panel">
        <div className="welcome-content">
          <div className="badge-group">
            <span className="badge home-ai-badge">
              <Sparkles size={14} />
              AI WORKSPACE
            </span>
            <span className="badge secure-badge">SECURE & SYNCED</span>
          </div>
          <h1>Welcome, {userName || 'Guest'}</h1>
          <p>
            Your AI-powered workspace — clean, fast, and beautifully organized. 
            Start capturing your ideas instantly.
          </p>
          <button className="btn btn-primary create-btn" onClick={() => navigate('/create')}>
            <PlusCircle size={20} />
            Create New Note
          </button>
        </div>
        <div className="welcome-illustration">
          <div className="sketch-icon"></div>
        </div>
      </section>

      {/* Modern Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column (2fr) */}
        <div className="dashboard-left-column">
          
          {/* Recently Edited Notes Section */}
          <div className="recent-notes-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <BookOpen size={20} color="var(--primary)" />
                <h3>Recently Edited</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate('/my-notes')} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                View All <ArrowRight size={14} />
              </button>
            </div>
            
            {loading ? (
              <div className="loading-placeholder">Loading recent notes...</div>
            ) : recentNotes.length === 0 ? (
              <div className="empty-placeholder">
                <FileText size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No notes found. Create your first note above!</p>
              </div>
            ) : (
              <div className="recent-notes-carousel">
                {recentNotes.map((note) => (
                  <div key={note.id} className="recent-note-item" onClick={() => navigate(`/note/${note.id}`)}>
                    <div className="recent-note-media">
                      {note.coverUrl ? (
                        <img src={note.coverUrl} alt="Cover" className="recent-cover-img" />
                      ) : (
                        <div className="recent-cover-placeholder">
                          <FileText size={24} />
                        </div>
                      )}
                      <div className="recent-note-date">
                        {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="recent-note-info">
                      <span className="recent-note-category">{note.category || 'General'}</span>
                      <h4>{note.title || 'Untitled Note'}</h4>
                      <p>{note.content ? note.content.replace(/[#*`]/g, '').slice(0, 70) + '...' : 'No content yet...'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Assistant Card */}
          <div className="ai-assistant-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Sparkles size={20} color="var(--accent)" />
                <h3>Quick AI Assistant</h3>
              </div>
            </div>
            <div className="ai-assistant-body">
              <div className="ai-search-bar">
                <input 
                  type="text" 
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask a question across all your notes..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  className="ai-widget-input"
                />
                <button 
                  onClick={handleAskAI}
                  disabled={isAiLoading || !aiQuery.trim()}
                  className="btn btn-primary ai-widget-btn"
                >
                  {isAiLoading ? <Loader2 size={16} className="spinner" /> : <ArrowRight size={16} />}
                </button>
              </div>

              {isAiLoading && (
                <div className="ai-widget-loading">
                  <Loader2 size={20} className="spinner" />
                  <span>Synthesizing answer...</span>
                </div>
              )}

              {aiResponse && !isAiLoading && (
                <div className="ai-widget-response fade-in">
                  <div className="markdown-preview">
                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (1fr) */}
        <div className="dashboard-right-column">

          {/* Quick Capture Scratchpad */}
          <div className="quick-capture-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <PenTool size={20} color="#eab308" />
                <h3>Quick Capture</h3>
              </div>
            </div>
            <div className="quick-capture-body">
              <textarea 
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Got a quick thought? Jot it down here and save it instantly..."
                className="quick-capture-textarea"
              />
              <button 
                onClick={handleQuickCapture}
                disabled={isSavingQuick || !quickText.trim()}
                className="btn btn-primary quick-save-btn"
              >
                {isSavingQuick ? <Loader2 size={16} className="spinner" /> : 'Save Note'}
              </button>
            </div>
          </div>

          {/* Productivity Analytics */}
          <div className="analytics-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Flame size={20} color="#f97316" />
                <h3>Productivity Status</h3>
              </div>
            </div>
            <div className="analytics-body">
              <div className="analytics-item">
                <div className="analytics-icon-wrapper blue">
                  <FileText size={20} />
                </div>
                <div className="analytics-info">
                  <span className="analytics-label">TOTAL NOTES</span>
                  <h4>{totalNotes}</h4>
                </div>
              </div>

              <div className="analytics-item">
                <div className="analytics-icon-wrapper green">
                  <BookOpen size={20} />
                </div>
                <div className="analytics-info">
                  <span className="analytics-label">TOTAL WORDS</span>
                  <h4>{totalWords}</h4>
                </div>
              </div>

              <div className="analytics-item">
                <div className="analytics-icon-wrapper purple">
                  <Sparkles size={20} />
                </div>
                <div className="analytics-info">
                  <span className="analytics-label">AI ENHANCED</span>
                  <h4>{totalNotes > 0 ? Math.round((aiBoostCount / totalNotes) * 100) : 0}%</h4>
                </div>
              </div>

              <div className="analytics-streak-box">
                <Flame size={28} className="flame-animation" />
                <div>
                  <h4>1 Day Streak!</h4>
                  <p>Keep the momentum going by taking notes daily.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HomePage;
