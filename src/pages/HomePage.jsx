import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  PenTool, 
  Loader2, 
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabaseClient';
import '../styles/HomePage.css';

const HomePage = ({ userName }) => {
  const navigate = useNavigate();
  
  // Basic Stats State
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

  // AI Productivity Station Tab State
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'pomodoro' | 'reading'
  
  // 1. Pomodoro Timer State
  const [timeLeft, setTimeLeft] = useState(1500); // default 25 min (1500s)
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState('focus'); // 'focus' | 'short' | 'long'
  const [weeklyFocusMinutes, setWeeklyFocusMinutes] = useState(0);
  const timerRef = useRef(null);

  // 2. Tasks State
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [breakingTaskId, setBreakingTaskId] = useState(null);

  // 3. Reading Tracker State
  const [books, setBooks] = useState([]);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookTotalPages, setBookTotalPages] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [notesList, setNotesList] = useState([]);

  // Load Dashboard Data & Integrations
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all notes to calculate statistics & fill notes dropdown for reading log
      const { data: allNotes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;

      setTotalNotes(allNotes.length);
      setNotesList(allNotes);
      
      let words = 0;
      let enhancedCount = 0;
      allNotes.forEach(note => {
        if (note.content) {
          words += note.content.trim().split(/\s+/).filter(Boolean).length;
          if (note.cover_image_path || (note.attachments && note.attachments.length > 0) || note.content.includes('#') || note.content.includes('**')) {
            enhancedCount++;
          }
        }
      });
      setTotalWords(words);
      setAiBoostCount(enhancedCount);

      // Fetch top 3 recently edited notes with signed cover URLs
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

      // Fetch other productivity widgets data
      await fetchTasks(user.id);
      await fetchFocusLogs(user.id);
      await fetchBooks(user.id);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // --- Pomodoro Audio Alert Beep ---
  const playAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5 beep
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch (e) {
      console.error('AudioContext beep failed:', e);
    }
  };

  // --- Timer Tick Handler ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleLogFocusSession();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  // Pomodoro Settings
  const handleModeChange = (mode) => {
    setIsActive(false);
    setTimerMode(mode);
    if (mode === 'focus') setTimeLeft(1500);
    else if (mode === 'short') setTimeLeft(300);
    else if (mode === 'long') setTimeLeft(900);
  };

  const handleLogFocusSession = async () => {
    playAlarmSound();
    const durationMinutes = timerMode === 'focus' ? 25 : timerMode === 'short' ? 5 : 15;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('focus_logs')
        .insert({
          duration: durationMinutes,
          user_id: user.id
        });
      
      if (error) throw error;
      await fetchFocusLogs(user.id);
      alert(`Great focus session! logged ${durationMinutes} minutes.`);
    } catch (e) {
      // LocalStorage fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`focus_logs_${user.id}`);
        const logs = local ? JSON.parse(local) : [];
        logs.push({
          id: 'local_' + Date.now(),
          duration: durationMinutes,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(`focus_logs_${user.id}`, JSON.stringify(logs));
        await fetchFocusLogs(user.id);
        alert(`Great focus session! logged ${durationMinutes} minutes locally.`);
      }
    }
  };

  const fetchFocusLogs = async (userId) => {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('focus_logs')
        .select('duration')
        .eq('user_id', userId)
        .gte('created_at', startOfWeek.toISOString());
      
      if (error) throw error;
      const total = data.reduce((acc, log) => acc + (log.duration || 0), 0);
      setWeeklyFocusMinutes(total);
    } catch (e) {
      const local = localStorage.getItem(`focus_logs_${userId}`);
      const logs = local ? JSON.parse(local) : [];
      
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const filtered = logs.filter(log => new Date(log.created_at) >= startOfWeek);
      const total = filtered.reduce((acc, log) => acc + (log.duration || 0), 0);
      setWeeklyFocusMinutes(total);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- 2. Tasks / Checklist Handlers ---
  const fetchTasks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      const local = localStorage.getItem(`tasks_${userId}`);
      setTasks(local ? JSON.parse(local) : []);
    }
  };

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTask = {
        title: taskInput,
        completed: false,
        sub_tasks: [],
        user_id: user.id
      };

      const { error } = await supabase.from('tasks').insert(newTask);
      if (error) throw error;
      setTaskInput('');
      await fetchTasks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      const local = localStorage.getItem(`tasks_${user.id}`);
      const list = local ? JSON.parse(local) : [];
      const newTask = {
        id: 'local_' + Date.now(),
        title: taskInput,
        completed: false,
        sub_tasks: [],
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      list.push(newTask);
      localStorage.setItem(`tasks_${user.id}`, JSON.stringify(list));
      setTasks(list);
      setTaskInput('');
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentStatus })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      const local = localStorage.getItem(`tasks_${user.id}`);
      if (local) {
        const list = JSON.parse(local);
        const updated = list.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));
        setTasks(updated);
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      const local = localStorage.getItem(`tasks_${user.id}`);
      if (local) {
        const list = JSON.parse(local);
        const updated = list.filter(t => t.id !== taskId);
        localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));
        setTasks(updated);
      }
    }
  };

  const handleToggleSubTask = async (taskId, subTaskIndex) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.sub_tasks) return;

    const updatedSubTasks = task.sub_tasks.map((st, idx) => 
      idx === subTaskIndex ? { ...st, completed: !st.completed } : st
    );

    await updateTaskSubTasks(taskId, updatedSubTasks);
  };

  const updateTaskSubTasks = async (taskId, subTasks) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tasks')
        .update({ sub_tasks: subTasks })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      const local = localStorage.getItem(`tasks_${user.id}`);
      if (local) {
        const list = JSON.parse(local);
        const updated = list.map(t => t.id === taskId ? { ...t, sub_tasks: subTasks } : t);
        localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));
        setTasks(updated);
      }
    }
  };

  const handleAiBreakdown = async (taskId, taskTitle) => {
    setBreakingTaskId(taskId);
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        alert("OpenAI API key is missing. Add it in Vercel or your .env.local file.");
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
              content: `You are a productivity expert. Break down the given task title into exactly 3 actionable, concrete sub-tasks. Respond with ONLY a raw JSON array of strings. Example: ["Review slideshow notes", "Do 3 practice questions", "Complete reading"]. Do not output any numbering, intro, or markdown brackets other than standard JSON.`
            },
            {
              role: 'user',
              content: `Task: ${taskTitle}`
            }
          ],
          temperature: 0.5,
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const rawText = data.choices[0].message.content.trim();
      const parsed = JSON.parse(rawText);
      
      if (Array.isArray(parsed)) {
        const formattedSubTasks = parsed.map(text => ({ text, completed: false }));
        await updateTaskSubTasks(taskId, formattedSubTasks);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate subtasks: " + err.message);
    } finally {
      setBreakingTaskId(null);
    }
  };

  // --- 3. Reading Tracker / Book Log Handlers ---
  const fetchBooks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (e) {
      const local = localStorage.getItem(`books_${userId}`);
      setBooks(local ? JSON.parse(local) : []);
    }
  };

  const handleAddBook = async () => {
    if (!bookTitle.trim()) return;
    const total = parseInt(bookTotalPages) || 100;
    const newBook = {
      title: bookTitle,
      author: bookAuthor || 'Unknown Author',
      current_page: 0,
      total_pages: total,
      note_id: selectedNoteId || null
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('books')
        .insert({
          ...newBook,
          user_id: user.id
        });

      if (error) throw error;
      setBookTitle('');
      setBookAuthor('');
      setBookTotalPages('');
      setSelectedNoteId('');
      await fetchBooks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`books_${user.id}`);
        const list = local ? JSON.parse(local) : [];
        const localBook = {
          id: 'localBook_' + Date.now(),
          ...newBook,
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        list.push(localBook);
        localStorage.setItem(`books_${user.id}`, JSON.stringify(list));
        setBooks(list);
        setBookTitle('');
        setBookAuthor('');
        setBookTotalPages('');
        setSelectedNoteId('');
      }
    }
  };

  const handleUpdatePageProgress = async (bookId, currentVal) => {
    const newVal = parseInt(currentVal);
    if (isNaN(newVal)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('books')
        .update({ current_page: newVal })
        .eq('id', bookId);

      if (error) throw error;
      await fetchBooks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`books_${user.id}`);
        if (local) {
          const list = JSON.parse(local);
          const updated = list.map(b => b.id === bookId ? { ...b, current_page: newVal } : b);
          localStorage.setItem(`books_${user.id}`, JSON.stringify(updated));
          setBooks(updated);
        }
      }
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;
      await fetchBooks(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`books_${user.id}`);
        if (local) {
          const list = JSON.parse(local);
          const updated = list.filter(b => b.id !== bookId);
          localStorage.setItem(`books_${user.id}`, JSON.stringify(updated));
          setBooks(updated);
        }
      }
    }
  };

  // --- Quick Capture note handler ---
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

  // Circular Pomodoro Progress math
  const timerRadius = 46;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const maxModeSeconds = timerMode === 'focus' ? 1500 : timerMode === 'short' ? 300 : 900;
  const strokeDashoffset = timerCircumference - (timeLeft / maxModeSeconds) * timerCircumference;

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

          {/* AI Productivity Station (Checklist, Timer, Reading) */}
          <div className="productivity-station-card glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '20px', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
            
            {/* Custom Tab Selector */}
            <div className="station-tabs" style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setActiveTab('todo')} 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s', background: activeTab === 'todo' ? 'white' : 'transparent', color: activeTab === 'todo' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'todo' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                📝 Tasks
              </button>
              <button 
                onClick={() => setActiveTab('pomodoro')} 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s', background: activeTab === 'pomodoro' ? 'white' : 'transparent', color: activeTab === 'pomodoro' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'pomodoro' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                ⏱️ Focus
              </button>
              <button 
                onClick={() => setActiveTab('reading')} 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s', background: activeTab === 'reading' ? 'white' : 'transparent', color: activeTab === 'reading' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'reading' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                📚 Books
              </button>
            </div>

            {/* TAB 1: Tasks Checklist */}
            {activeTab === 'todo' && (
              <div className="todo-widget-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Add a study goal..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem' }}
                  />
                  <button onClick={handleAddTask} className="btn btn-primary" style={{ padding: '0 12px', borderRadius: '10px' }}>
                    <Plus size={16} />
                  </button>
                </div>

                <div className="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>No goals scheduled. Add one above!</div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="task-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'white', padding: '10px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }} onClick={() => handleToggleTask(task.id, task.completed)}>
                            {task.completed ? (
                              <CheckSquare size={18} color="var(--primary)" />
                            ) : (
                              <Square size={18} color="#cbd5e1" />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: task.completed ? 'var(--text-light)' : 'var(--text-main)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                              {task.title}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleAiBreakdown(task.id, task.title)}
                              disabled={breakingTaskId === task.id || task.completed}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Breakdown with AI"
                            >
                              {breakingTaskId === task.id ? (
                                <Loader2 size={14} className="spinner" />
                              ) : (
                                <Sparkles size={14} />
                              )}
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Nested Sub-Tasks */}
                        {task.sub_tasks && task.sub_tasks.length > 0 && (
                          <div className="sub-tasks-list" style={{ marginLeft: '26px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px dashed #e2e8f0', paddingLeft: '10px', marginTop: '4px' }}>
                            {task.sub_tasks.map((st, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => handleToggleSubTask(task.id, idx)}>
                                {st.completed ? (
                                  <CheckCircle size={14} color="#10b981" />
                                ) : (
                                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #cbd5e1' }}></div>
                                )}
                                <span style={{ fontSize: '0.8rem', color: st.completed ? 'var(--text-light)' : 'var(--text-muted)', textDecoration: st.completed ? 'line-through' : 'none' }}>
                                  {st.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Pomodoro Timer */}
            {activeTab === 'pomodoro' && (
              <div className="pomodoro-widget-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.02)', padding: '3px', borderRadius: '10px', width: '100%' }}>
                  <button onClick={() => handleModeChange('focus')} style={{ flex: 1, border: 'none', background: timerMode === 'focus' ? 'white' : 'transparent', color: timerMode === 'focus' ? 'var(--primary)' : 'var(--text-muted)', padding: '5px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: timerMode === 'focus' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none' }}>Focus (25m)</button>
                  <button onClick={() => handleModeChange('short')} style={{ flex: 1, border: 'none', background: timerMode === 'short' ? 'white' : 'transparent', color: timerMode === 'short' ? 'var(--primary)' : 'var(--text-muted)', padding: '5px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: timerMode === 'short' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none' }}>Short Break (5m)</button>
                  <button onClick={() => handleModeChange('long')} style={{ flex: 1, border: 'none', background: timerMode === 'long' ? 'white' : 'transparent', color: timerMode === 'long' ? 'var(--primary)' : 'var(--text-muted)', padding: '5px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: timerMode === 'long' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none' }}>Long Break (15m)</button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="56" cy="56" r={timerRadius} stroke="rgba(0,0,0,0.04)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r={timerRadius} 
                      stroke="var(--primary)" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={timerCircumference}
                      strokeDashoffset={isNaN(strokeDashoffset) ? 0 : strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {formatTime(timeLeft)}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {timerMode}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setIsActive(!isActive)} className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '0.85rem' }}>
                    {isActive ? <Pause size={16} /> : <Play size={16} />}
                    {isActive ? 'Pause' : 'Start'}
                  </button>
                  <button onClick={() => handleModeChange(timerMode)} className="btn btn-secondary" style={{ padding: '8px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Reading Tracker */}
            {activeTab === 'reading' && (
              <div className="reading-widget-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADD A BOOK</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      placeholder="Title..." 
                      value={bookTitle} 
                      onChange={(e) => setBookTitle(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Author..." 
                      value={bookAuthor} 
                      onChange={(e) => setBookAuthor(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="number" 
                      placeholder="Total Pages..." 
                      value={bookTotalPages} 
                      onChange={(e) => setBookTotalPages(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <select 
                      value={selectedNoteId} 
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'var(--text-muted)' }}
                    >
                      <option value="">Link Note...</option>
                      {notesList.map(note => (
                        <option key={note.id} value={note.id}>{note.title}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleAddBook} className="btn btn-primary" style={{ padding: '6px', fontSize: '0.8rem', borderRadius: '8px', marginTop: '4px' }}>
                    <Plus size={14} /> Add Book
                  </button>
                </div>

                <div className="books-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {books.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>No books listed. Track your first book above!</div>
                  ) : (
                    books.map((book) => {
                      const progress = Math.min(100, Math.round((book.current_page / book.total_pages) * 100)) || 0;
                      return (
                        <div key={book.id} style={{ background: 'white', border: '1px solid #f1f5f9', padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{book.title}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {book.author}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {book.note_id && (
                                <button 
                                  onClick={() => navigate(`/note/${book.note_id}`)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}
                                  title="Open Linked Note"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteBook(book.id)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(to right, var(--primary), var(--accent))', borderRadius: '10px' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{progress}%</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                              Page {book.current_page} / {book.total_pages}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Page:</span>
                              <input 
                                type="number" 
                                defaultValue={book.current_page} 
                                onBlur={(e) => handleUpdatePageProgress(book.id, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdatePageProgress(book.id, e.target.value)}
                                style={{ width: '45px', padding: '2px 4px', fontSize: '0.7rem', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

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

              <div className="analytics-item">
                <div className="analytics-icon-wrapper" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <RotateCcw size={20} />
                </div>
                <div className="analytics-info">
                  <span className="analytics-label">WEEKLY FOCUS</span>
                  <h4>{(weeklyFocusMinutes / 60).toFixed(1)} hrs</h4>
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
