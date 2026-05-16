import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Save, 
  X, 
  Tag, 
  ArrowLeft, 
  Edit3, 
  Bold, 
  Italic, 
  List, 
  Link as LinkIcon, 
  Underline,
  Eye,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import '../styles/CreateNotePage.css';

const CreateNotePage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'edit';
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const isViewMode = id && mode === 'view';

  useEffect(() => {
    if (id) {
      fetchNote();
    }
  }, [id]);

  const fetchNote = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category || 'General');
      }
    } catch (error) {
      console.error('Error fetching note:', error.message);
      navigate('/my-notes');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (isViewMode) return;
    if (!title || !content) {
      alert('Please fill in both title and content');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (id) {
        const { error } = await supabase
          .from('notes')
          .update({ title, content, category, updated_at: new Date() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .insert([{ title, content, category, user_id: user.id }]);
        if (error) throw error;
      }
      navigate('/my-notes');
    } catch (error) {
      alert('Error saving note: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (prefix, suffix = prefix) => {
    if (isViewMode || isPreview) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = before + prefix + selectedText + suffix + after;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleAiEnhance = () => {
    if (isViewMode || isPreview) return;
    setIsAiEnhancing(true);
    setTimeout(() => {
      setContent(prev => prev + "\n\n[AI ENHANCED]: " + prev.toUpperCase());
      setIsAiEnhancing(false);
    }, 1500);
  };

  if (fetching) {
    return <div className="loading-state">Loading note...</div>;
  }

  return (
    <div className={`create-note-page fade-in ${isViewMode ? 'view-mode' : ''}`}>
      <div className="editor-container glass-panel">
        <header className="editor-header">
          <div className="header-left">
            <div className="back-button" onClick={() => navigate('/my-notes')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
              <ArrowLeft size={16} />
              Back to Notes
            </div>
            <input 
              type="text" 
              placeholder="Note Title" 
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={isViewMode}
            />
            <div className="category-selector">
              <Tag size={14} />
              {isViewMode ? (
                <span className="category-display">{category}</span>
              ) : (
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>General</option>
                  <option>Work</option>
                  <option>Personal</option>
                  <option>Ideas</option>
                </select>
              )}
            </div>
          </div>
          <div className="header-right">
            {isViewMode ? (
              <button className="btn btn-secondary" onClick={() => setSearchParams({ mode: 'edit' })}>
                <Edit3 size={18} />
                Edit Note
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                <Save size={18} />
                {loading ? 'Saving...' : id ? 'Update Note' : 'Save Note'}
              </button>
            )}
          </div>
        </header>

        {!isViewMode && (
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => formatText('**')} title="Bold"><Bold size={18} /></button>
              <button className="toolbar-btn" onClick={() => formatText('_')} title="Italic"><Italic size={18} /></button>
              <button className="toolbar-btn" onClick={() => formatText('<u>', '</u>')} title="Underline"><Underline size={18} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => formatText('\n- ')} title="Bullet List"><List size={18} /></button>
              <button className="toolbar-btn" onClick={() => formatText('[', '](url)')} title="Add Link"><LinkIcon size={18} /></button>
            </div>
            <div className="toolbar-divider"></div>
            <button 
              className={`toolbar-btn mode-toggle ${isPreview ? 'active' : ''}`} 
              onClick={() => setIsPreview(!isPreview)}
              title={isPreview ? "Switch to Editor" : "Switch to Preview"}
            >
              {isPreview ? <FileText size={18} /> : <Eye size={18} />}
              <span style={{ fontSize: '0.75rem', marginLeft: '6px' }}>{isPreview ? 'Editor' : 'Preview'}</span>
            </button>
            <button 
              className={`ai-enhance-btn ${isAiEnhancing ? 'animating' : ''}`}
              onClick={handleAiEnhance}
              disabled={isPreview}
            >
              <Sparkles size={18} />
              {isAiEnhancing ? 'Enhancing...' : 'AI Enhance'}
            </button>
          </div>
        )}

        {isViewMode || isPreview ? (
          <div className="markdown-preview">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {content || "*No content provided.*"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea 
            ref={textareaRef}
            className="content-editor" 
            placeholder="Start typing your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        )}
      </div>
    </div>
  );
};

export default CreateNotePage;
