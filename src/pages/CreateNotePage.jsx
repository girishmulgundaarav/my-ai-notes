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
  FileText,
  Calendar,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Loader2
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
  const [suggestedContent, setSuggestedContent] = useState(null);
  
  const [coverImagePath, setCoverImagePath] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState(null);
  const [attachments, setAttachments] = useState([]);
  
  const coverInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  
  const [draftId] = useState(() => `draft_${Math.random().toString(36).substring(2, 15)}`);
  const effectiveId = id || draftId;
  
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const isViewMode = id && mode === 'view';

  // Format current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

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
        setCoverImagePath(data.cover_image_path);
        
        if (data.cover_image_path) {
          const { data: urlData } = await supabase.storage.from('app-files').createSignedUrl(data.cover_image_path, 3600);
          if (urlData) setCoverImageUrl(urlData.signedUrl);
        }
        
        const dbAttachments = data.attachments || [];
        if (dbAttachments.length > 0) {
           const loadedAttachments = [...dbAttachments];
           for (let i = 0; i < loadedAttachments.length; i++) {
              const { data: urlData } = await supabase.storage.from('app-files').createSignedUrl(loadedAttachments[i].path, 3600);
              if (urlData) loadedAttachments[i].url = urlData.signedUrl;
           }
           setAttachments(loadedAttachments);
        }
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
      const attachmentsToSave = attachments.map(({ name, path }) => ({ name, path }));
      
      if (id) {
        const { error } = await supabase
          .from('notes')
          .update({ title, content, category, cover_image_path: coverImagePath, attachments: attachmentsToSave, updated_at: new Date() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .insert([{ title, content, category, user_id: user.id, cover_image_path: coverImagePath, attachments: attachmentsToSave }]);
        if (error) throw error;
      }
      navigate('/my-notes');
    } catch (error) {
      alert('Error saving note: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const uuid = Math.random().toString(36).substring(2, 15);
      const filePath = `${user.id}/covers/${effectiveId}/${uuid}.${fileExt}`;
      
      const { error } = await supabase.storage.from('app-files').upload(filePath, file);
      if (error) throw error;
      
      setCoverImagePath(filePath);
      const { data } = await supabase.storage.from('app-files').createSignedUrl(filePath, 3600);
      if (data) setCoverImageUrl(data.signedUrl);
    } catch (error) {
      alert('Error uploading cover: ' + error.message);
    }
  };

  const handleRemoveCover = async () => {
    if (coverImagePath) {
      await supabase.storage.from('app-files').remove([coverImagePath]);
      setCoverImagePath(null);
      setCoverImageUrl(null);
    }
  };

  const handleAttachmentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const uuid = Math.random().toString(36).substring(2, 15);
      const filePath = `${user.id}/attachments/${effectiveId}/${uuid}.${fileExt}`;
      
      const { error } = await supabase.storage.from('app-files').upload(filePath, file);
      if (error) throw error;
      
      const { data } = await supabase.storage.from('app-files').createSignedUrl(filePath, 3600);
      setAttachments(prev => [...prev, { name: file.name, path: filePath, url: data?.signedUrl }]);
    } catch (error) {
      alert('Error uploading attachment: ' + error.message);
    }
  };
  
  const handleRemoveAttachment = async (pathToRemove) => {
    await supabase.storage.from('app-files').remove([pathToRemove]);
    setAttachments(prev => prev.filter(att => att.path !== pathToRemove));
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

  const handleAiEnhance = async () => {
    if (isViewMode || isPreview || !content.trim()) return;
    setIsAiEnhancing(true);
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        alert("OpenAI API Key is missing. Please add it to your .env.local file.");
        setIsAiEnhancing(false);
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
              content: 'You are an expert writing assistant. Fix grammar, spelling, and improve the flow of the provided text. Use markdown formatting like headings, bullet points, and bold text where appropriate to organize the note better. Provide only the enhanced text, without any introductory conversational text.'
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const enhancedText = data.choices[0].message.content;

      setSuggestedContent(enhancedText);
    } catch (error) {
      console.error("Failed to enhance text:", error);
      alert("Failed to enhance text. Please check the console for details.");
    } finally {
      setIsAiEnhancing(false);
    }
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
            
            <div className="meta-row">
              <div className="meta-date">
                <Calendar size={14} />
                <span>{currentDate}</span>
              </div>
              <div className="meta-actions">
                {!isViewMode && (
                  <>
                    <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" style={{ display: 'none' }} />
                    <button className="meta-btn" onClick={() => coverInputRef.current?.click()}>
                      <ImageIcon size={14} />
                      <span>{coverImagePath ? 'Change Cover' : 'Add Cover'}</span>
                    </button>
                    {coverImagePath && (
                      <button className="meta-btn" onClick={handleRemoveCover} style={{ color: '#ef4444', padding: '6px 8px' }}>
                        <X size={14} />
                      </button>
                    )}
                    
                    <input type="file" ref={attachmentInputRef} onChange={handleAttachmentUpload} style={{ display: 'none' }} />
                    <button className="meta-btn" onClick={() => attachmentInputRef.current?.click()}>
                      <Paperclip size={14} />
                      <span>Attach Files</span>
                    </button>
                  </>
                )}
                {isViewMode ? (
                  <button className="btn btn-secondary" onClick={() => setSearchParams({ mode: 'edit' })} style={{ padding: '6px 16px', fontSize: '0.85rem', borderRadius: '20px', height: '100%' }}>
                    <Edit3 size={14} />
                    Edit Note
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ padding: '6px 16px', fontSize: '0.85rem', borderRadius: '20px', height: '100%' }}>
                    <Save size={14} />
                    {loading ? 'Saving...' : id ? 'Update Note' : 'Save Note'}
                  </button>
                )}
              </div>
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
        </header>

        {coverImageUrl && (
          <div className="note-cover-image" style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
            <img src={coverImageUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="note-attachments" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            {attachments.map((att, index) => (
              <div key={index} className="attachment-pill glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <Paperclip size={14} color="var(--primary)" />
                <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                  {att.name}
                </a>
                {!isViewMode && (
                  <button onClick={() => handleRemoveAttachment(att.path)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '2px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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

        {suggestedContent && (
          <div className="ai-suggestion-panel glass-panel" style={{ marginTop: '24px', border: '2px solid var(--primary)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> AI Suggestion
              </h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setSuggestedContent(null)}>
                  Discard
                </button>
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => { setContent(suggestedContent); setSuggestedContent(null); }}>
                  Replace Original
                </button>
              </div>
            </div>
            <div className="markdown-preview" style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{suggestedContent}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateNotePage;
