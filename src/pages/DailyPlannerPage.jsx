import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  Circle, 
  Droplet, 
  Target, 
  Compass, 
  Database,
  Lock,
  Plus,
  RefreshCw,
  Award
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../styles/DailyPlannerPage.css';

const HOURS = [
  "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM",
  "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"
];

const CATEGORIES = [
  "Focus Work 💻",
  "Study 📚",
  "Health/Fitness 🏃‍♂️",
  "Personal/Routine ☕",
  "Leisure/Rest 🎮"
];

const MOODS = [
  { emoji: "🤩", label: "Energized" },
  { emoji: "🙂", label: "Happy" },
  { emoji: "😐", label: "Focused" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🧠", label: "Brain Fog" }
];

const DEFAULT_EVENTS = HOURS.map(hour => {
  let defaultCategory = "Personal/Routine ☕";
  if (hour.includes("07:00 AM") || hour.includes("08:00 AM") || hour.includes("09:00 PM") || hour.includes("10:00 PM")) {
    defaultCategory = "Personal/Routine ☕";
  } else if (hour.includes("12:00 PM") || hour.includes("01:00 PM") || hour.includes("06:00 PM") || hour.includes("07:00 PM")) {
    defaultCategory = "Leisure/Rest 🎮";
  } else {
    defaultCategory = "Focus Work 💻";
  }
  return {
    hour,
    text: "",
    category: defaultCategory,
    completed: false
  };
});

const DEFAULT_INTENTIONS = {
  focus: "",
  gratitude: ["", "", ""],
  waterCount: 0,
  selectedMood: ""
};

const DailyPlannerPage = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => {
    // Return local date string formatted as YYYY-MM-DD
    const localDate = new Date();
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    return new Date(localDate.getTime() - tzOffset).toISOString().split('T')[0];
  });
  
  // State variables
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [intentions, setIntentions] = useState(DEFAULT_INTENTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Syncing...');
  
  // AI Coach state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendedEvents, setAiRecommendedEvents] = useState(null);
  const [aiAffirmation, setAiAffirmation] = useState('');
  const [loadingAffirmation, setLoadingAffirmation] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load planner details when date changes
  useEffect(() => {
    loadPlannerData(date);
    fetchAiAffirmation();
  }, [date]);

  // Sync data fetcher
  const loadPlannerData = async (selectedDate) => {
    setLoading(true);
    setSyncStatus('Syncing...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus('Not Authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Query Supabase daily_plans
      const { data, error } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate);

      if (error) throw error;

      if (data && data.length > 0) {
        const plan = data[0];
        setEvents(plan.events || DEFAULT_EVENTS);
        setIntentions(plan.intentions || DEFAULT_INTENTIONS);
        setSyncStatus('Synced to Cloud');
      } else {
        // Fallback to local storage if present
        const local = localStorage.getItem(`daily_plan_${user.id}_${selectedDate}`);
        if (local) {
          const parsed = JSON.parse(local);
          setEvents(parsed.events || DEFAULT_EVENTS);
          setIntentions(parsed.intentions || DEFAULT_INTENTIONS);
          setSyncStatus('Saved Locally');
        } else {
          setEvents(DEFAULT_EVENTS);
          setIntentions(DEFAULT_INTENTIONS);
          setSyncStatus('Ready (Not Saved)');
        }
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to LocalStorage:', e);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const local = localStorage.getItem(`daily_plan_${user.id}_${selectedDate}`);
          if (local) {
            const parsed = JSON.parse(local);
            setEvents(parsed.events || DEFAULT_EVENTS);
            setIntentions(parsed.intentions || DEFAULT_INTENTIONS);
          } else {
            setEvents(DEFAULT_EVENTS);
            setIntentions(DEFAULT_INTENTIONS);
          }
          setSyncStatus('Saved Locally');
        }
      } catch (localErr) {
        console.error('LocalStorage load failed:', localErr);
        setSyncStatus('Save Offline');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync data saver
  const savePlannerData = async (selectedDate, currentEvents, currentIntentions) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing, error: checkError } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', selectedDate);

      if (checkError) throw checkError;

      let error = null;
      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('daily_plans')
          .update({
            events: currentEvents,
            intentions: currentIntentions,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing[0].id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('daily_plans')
          .insert({
            user_id: user.id,
            date: selectedDate,
            events: currentEvents,
            intentions: currentIntentions
          });
        error = insertError;
      }

      if (error) throw error;
      setSyncStatus('Synced to Cloud');
    } catch (e) {
      console.warn('Supabase save failed, falling back to LocalStorage:', e);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const payload = { events: currentEvents, intentions: currentIntentions };
          localStorage.setItem(`daily_plan_${user.id}_${selectedDate}`, JSON.stringify(payload));
          setSyncStatus('Saved Locally');
        }
      } catch (localErr) {
        console.error('LocalStorage save failed:', localErr);
        setSyncStatus('Save Offline');
      }
    } finally {
      setSaving(false);
    }
  };

  // Change active date
  const handleDateChange = (days) => {
    const current = new Date(date + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const tzOffset = current.getTimezoneOffset() * 60000;
    const nextDate = new Date(current.getTime() - tzOffset).toISOString().split('T')[0];
    setDate(nextDate);
    setAiRecommendedEvents(null);
  };

  // Timeline Handlers
  const handleEventChange = (index, value) => {
    const updated = events.map((ev, idx) => idx === index ? { ...ev, text: value } : ev);
    setEvents(updated);
  };

  const handleCategoryChange = (index, category) => {
    const updated = events.map((ev, idx) => idx === index ? { ...ev, category } : ev);
    setEvents(updated);
    savePlannerData(date, updated, intentions);
  };

  const handleToggleEvent = (index) => {
    const updated = events.map((ev, idx) => idx === index ? { ...ev, completed: !ev.completed } : ev);
    setEvents(updated);
    savePlannerData(date, updated, intentions);
  };

  // Wellness Handlers
  const handleIntentionBlur = (key, value) => {
    const updated = { ...intentions, [key]: value };
    setIntentions(updated);
    savePlannerData(date, events, updated);
  };

  const handleGratitudeBlur = (index, value) => {
    const updatedGratitude = [...intentions.gratitude];
    updatedGratitude[index] = value;
    const updated = { ...intentions, gratitude: updatedGratitude };
    setIntentions(updated);
    savePlannerData(date, events, updated);
  };

  const handleWaterClick = (index) => {
    const newCount = intentions.waterCount === index + 1 ? index : index + 1;
    const updated = { ...intentions, waterCount: newCount };
    setIntentions(updated);
    savePlannerData(date, events, updated);
  };

  const handleMoodSelect = (mood) => {
    const updated = { ...intentions, selectedMood: mood };
    setIntentions(updated);
    savePlannerData(date, events, updated);
  };

  // AI Daily affirmation/productivity quote fetcher
  const fetchAiAffirmation = async () => {
    setLoadingAffirmation(true);
    setAiAffirmation('');
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        setAiAffirmation('Affirmation of the day: "Your potential is limitless. Plan with purpose, act with courage."');
        setLoadingAffirmation(false);
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
              content: 'You are an inspiring daily planner coach. Generate a single sentence daily affirmation or high-energy quote (maximum 16 words) to motivate the user to plan and tackle their day. Do not include quotes surrounding the text.'
            }
          ],
          temperature: 0.8,
          max_tokens: 40
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setAiAffirmation(data.choices[0].message.content.trim());
    } catch (e) {
      setAiAffirmation('Affirmation of the day: "Focus on progress, not perfection. Today is your canvas."');
    } finally {
      setLoadingAffirmation(false);
    }
  };

  // AI Planner Coach Algorithm
  const handleAiOptimizeSchedule = async () => {
    setAiLoading(true);
    setAiRecommendedEvents(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to use AI schedule optimization.");
        setAiLoading(false);
        return;
      }

      // 1. Fetch study checklist tasks
      let fetchedTasks = [];
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('created_at', { ascending: true })
          .limit(6);
        
        if (!error) fetchedTasks = data || [];
      } catch (dbErr) {
        const local = localStorage.getItem(`tasks_${user.id}`);
        if (local) {
          fetchedTasks = JSON.parse(local).filter(t => !t.completed).slice(0, 6);
        }
      }

      // 2. Fetch notes titles
      let noteTitles = [];
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('title')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (!error && data) noteTitles = data.map(n => n.title);
      } catch (e) {
        console.warn("Could not fetch notes context:", e);
      }

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        alert("VITE_OPENAI_API_KEY is not defined. Please add it to your environmental settings.");
        setAiLoading(false);
        return;
      }

      const taskTitles = fetchedTasks.map(t => t.title);
      
      const prompt = `You are an elite productivity coach. Optimize the daily hour-by-hour schedule from 07:00 AM to 10:00 PM (exactly 16 slots).
      
      Here are the user's active, unfinished study tasks:
      ${taskTitles.length > 0 ? taskTitles.join(', ') : 'None listed. Schedule general focused work blocks.'}
      
      Here are their recent notes:
      ${noteTitles.length > 0 ? noteTitles.join(', ') : 'None listed.'}

      Requirements:
      1. Provide exactly 16 slots.
      2. Set a realistic schedule: Morning routine at 7 AM, lunch around 12 PM or 1 PM, deep focus blocks in the morning/afternoon, dinner/unwinding at night.
      3. Fit their active study tasks into the Focus Work and Study blocks!
      4. For each hourly slot, respond with exactly:
         - "hour": Exact matching hour string from: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM']
         - "text": Motivating and descriptive block task/activity. (e.g. "Focus block: Write biology outline", "Nourish lunch break", "Mindfulness walk").
         - "category": Choose exactly one from: ['Focus Work 💻', 'Study 📚', 'Health/Fitness 🏃‍♂️', 'Personal/Routine ☕', 'Leisure/Rest 🎮']
         - "completed": false

      Return ONLY a raw JSON array of 16 objects. Do not include markdown brackets, do not include \`\`\`json, do not write pre/post text. Validate that it parses as JSON array instantly.`;

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
              content: 'You are an expert AI Scheduler. You output ONLY raw valid JSON array strings. No conversational output.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const apiData = await response.json();
      const rawText = apiData.choices[0].message.content.trim();
      
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length === 16) {
        setAiRecommendedEvents(parsed);
      } else {
        throw new Error("Invalid schedule structure returned by AI");
      }

    } catch (err) {
      console.error(err);
      alert("AI Schedule optimization failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSchedule = () => {
    if (!aiRecommendedEvents) return;
    setEvents(aiRecommendedEvents);
    savePlannerData(date, aiRecommendedEvents, intentions);
    setAiRecommendedEvents(null);
    alert("AI schedule successfully applied!");
  };

  // Math metrics for visualization
  const completedEventsCount = events.filter(e => e.completed && e.text.trim() !== "").length;
  const totalEventsCount = events.filter(e => e.text.trim() !== "").length;
  const progressPercent = totalEventsCount > 0 ? Math.round((completedEventsCount / totalEventsCount) * 100) : 0;

  // Format date readable
  const getReadableDate = () => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="planner-page fade-in">
      {/* Page Header */}
      <header className="planner-header glass-panel">
        <div className="header-meta">
          <div className="planner-badge">
            <Calendar size={14} />
            <span>DAILY PLANNER</span>
          </div>
          <div className={`sync-status ${syncStatus.toLowerCase().replace(/\s/g, '-')}`}>
            <span className="dot"></span>
            {syncStatus === 'Synced to Cloud' ? <Database size={12} /> : <Lock size={12} />}
            <span>{syncStatus}</span>
          </div>
        </div>

        <div className="date-navigator">
          <button className="nav-btn" onClick={() => handleDateChange(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h2>{getReadableDate()}</h2>
          <button className="nav-btn" onClick={() => handleDateChange(1)}>
            <ChevronRight size={20} />
          </button>
          
          <input 
            type="date" 
            value={date} 
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="header-date-picker"
          />
        </div>
      </header>

      {/* Daily Affirmation Banner */}
      <section className="affirmation-banner glass-panel">
        <Compass size={20} className="compass-icon" />
        {loadingAffirmation ? (
          <div className="shimmer-line"></div>
        ) : (
          <p className="affirmation-text">"{aiAffirmation || 'Plan with clarity, focus with determination, and make today count.'}"</p>
        )}
        <button className="btn-refresh-quote" onClick={fetchAiAffirmation} title="Refresh daily quote">
          <RefreshCw size={14} />
        </button>
      </section>

      {/* Main Grid */}
      <div className="planner-grid">
        {/* Left Column - Timeblocking Timeline */}
        <div className="planner-left-column">
          <div className="timeline-card glass-panel">
            <div className="card-header-bar">
              <div className="header-info">
                <h3>Time Blocking Timeline</h3>
                <p>Plan out hourly focus slots to align with your intentions</p>
              </div>
              <div className="completion-stats">
                <span className="count">{completedEventsCount}/{totalEventsCount} Done</span>
                <div className="stats-progress-ring">
                  <div className="progress-value" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="percent">{progressPercent}%</span>
              </div>
            </div>

            {loading ? (
              <div className="planner-loading">
                <Loader2 size={36} className="spinner" />
                <span>Loading your timeline...</span>
              </div>
            ) : (
              <div className="timeline-slots-container">
                {events.map((slot, index) => {
                  const isActiveHour = false; // Optional styling logic
                  
                  return (
                    <div 
                      key={index} 
                      className={`timeline-slot-row ${slot.completed ? 'completed' : ''} ${slot.text ? 'has-content' : ''}`}
                    >
                      <div className="slot-time-column">{slot.hour}</div>
                      
                      <div className="slot-action-checkbox" onClick={() => handleToggleEvent(index)}>
                        {slot.completed ? (
                          <CheckCircle size={18} color="var(--primary)" className="check-icon" />
                        ) : (
                          <Circle size={18} color="var(--text-light)" className="check-icon" />
                        )}
                      </div>

                      <div className="slot-input-wrapper">
                        <input 
                          type="text" 
                          value={slot.text}
                          onChange={(e) => handleEventChange(index, e.target.value)}
                          onBlur={() => savePlannerData(date, events, intentions)}
                          placeholder="Tap to log an activity or block time..."
                          className="slot-text-input"
                        />
                      </div>

                      <div className="slot-dropdown-wrapper">
                        <select 
                          value={slot.category} 
                          onChange={(e) => handleCategoryChange(index, e.target.value)}
                          className="slot-category-select"
                        >
                          {CATEGORIES.map((cat, i) => (
                            <option key={i} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Wellness & AI Coach */}
        <div className="planner-right-column">
          
          {/* AI Schedule Coach Card */}
          <div className="ai-coach-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Sparkles size={20} color="var(--accent)" className="sparkle-anim" />
                <h3>AI Schedule Coach</h3>
              </div>
              <span className="pill-badge-ai">GPT OPTIMIZED</span>
            </div>

            <div className="ai-coach-body">
              <p className="coach-intro">
                Aligns your hourly schedule with active study tasks & notes automatically.
              </p>

              <button 
                onClick={handleAiOptimizeSchedule}
                disabled={aiLoading}
                className="btn btn-primary ai-coach-btn"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Analyzing Tasks & Planning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Optimize My Day with AI</span>
                  </>
                )}
              </button>

              {aiRecommendedEvents && (
                <div className="ai-recommendation-preview fade-in">
                  <div className="preview-header">
                    <Award size={16} color="var(--accent)" />
                    <h4>Generated Schedule Ready</h4>
                  </div>
                  <p className="preview-meta">
                    This will replace your current schedule with realistic focus hours mapped to your task goals.
                  </p>
                  
                  <div className="preview-list">
                    {aiRecommendedEvents.slice(2, 9).map((rec, i) => (
                      <div key={i} className="preview-item">
                        <span className="time">{rec.hour}</span>
                        <span className="text">{rec.text}</span>
                        <span className="cat">{rec.category.split(' ').pop()}</span>
                      </div>
                    ))}
                    <div className="dots-indicator">•••</div>
                  </div>

                  <div className="preview-actions">
                    <button onClick={handleApplyAiSchedule} className="btn btn-primary btn-apply">
                      Apply to Schedule
                    </button>
                    <button onClick={() => setAiRecommendedEvents(null)} className="btn btn-secondary btn-cancel">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily Focus & Gratitude Widget */}
          <div className="intentions-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Target size={20} color="var(--primary)" />
                <h3>Daily Focus & Intentions</h3>
              </div>
            </div>
            
            <div className="intentions-body">
              <div className="focus-input-group">
                <label>TODAY'S MAIN TARGET</label>
                <input 
                  type="text" 
                  value={intentions.focus}
                  onChange={(e) => setIntentions({ ...intentions, focus: e.target.value })}
                  onBlur={(e) => handleIntentionBlur('focus', e.target.value)}
                  placeholder="What is the one thing that makes today a win?"
                  className="main-focus-input"
                />
              </div>

              <div className="gratitude-input-group">
                <label>I AM GRATEFUL FOR...</label>
                {intentions.gratitude.map((item, idx) => (
                  <div key={idx} className="gratitude-row">
                    <span className="number">0{idx + 1}</span>
                    <input 
                      type="text" 
                      value={item}
                      onChange={(e) => handleGratitudeChange(idx, e.target.value)}
                      onBlur={(e) => handleGratitudeBlur(idx, e.target.value)}
                      placeholder={`Something I appreciate...`}
                      className="gratitude-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Water Intake Widget */}
          <div className="water-widget-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Droplet size={20} color="#38bdf8" />
                <h3>Water Hydration Tracker</h3>
              </div>
              <span className="water-target-badge">{intentions.waterCount * 250} ml / 2000 ml</span>
            </div>

            <div className="water-widget-body">
              <p className="water-desc">Stay sharp and maintain focus by keeping hydrated throughout the day.</p>
              
              <div className="water-cups-grid">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const isFilled = idx < intentions.waterCount;
                  return (
                    <button 
                      key={idx}
                      className={`water-glass-btn ${isFilled ? 'filled' : ''}`}
                      onClick={() => handleWaterClick(idx)}
                      title={`Drink glass ${idx + 1}`}
                    >
                      <div className="glass-container">
                        <Droplet size={24} className="glass-droplet" />
                        {isFilled && <div className="glass-wave-fill" />}
                      </div>
                      <span className="glass-label">{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mood Log Card */}
          <div className="mood-widget-card glass-panel">
            <div className="card-header">
              <div className="header-title">
                <Compass size={20} color="var(--primary)" />
                <h3>Daily Focus & Energy Level</h3>
              </div>
            </div>

            <div className="mood-widget-body">
              <p className="mood-desc">Check-in with your mental energy level today:</p>
              <div className="mood-selector-row">
                {MOODS.map((m, idx) => {
                  const isSelected = intentions.selectedMood === m.emoji;
                  return (
                    <button 
                      key={idx}
                      className={`mood-emoji-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleMoodSelect(m.emoji)}
                      title={m.label}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-label">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DailyPlannerPage;
