import React, { useState } from 'react';
import {
  Plus, Trash2, Sparkles, Loader2, Flame, Award,
  CheckCircle, Circle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const HABIT_CATEGORIES = [
  { label: 'Health & Fitness 🏃', value: 'Health' },
  { label: 'Mind & Learning 📚', value: 'Learning' },
  { label: 'Creativity 🎨', value: 'Creativity' },
  { label: 'Productivity 💻', value: 'Productivity' },
  { label: 'General ⭐', value: 'General' }
];

const HABIT_ICONS = ['⭐','📚','🏃','💧','🧘','🎨','💻','🎵','✍️','🌱'];
const HABIT_COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Helper: get array of date strings for current week (Mon-Sun)
const getWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Helper: compute current streak
const computeStreak = (habitId, logs) => {
  const habitDates = logs
    .filter(l => l.habit_id === habitId)
    .map(l => l.completed_date)
    .sort((a, b) => b.localeCompare(a));
  if (habitDates.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  const checkDate = new Date(today);
  for (let i = 0; i < 400; i++) {
    const ds = checkDate.toISOString().split('T')[0];
    if (habitDates.includes(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
};

// Helper: compute best streak ever
const computeBestStreak = (habitId, logs) => {
  const habitDates = logs
    .filter(l => l.habit_id === habitId)
    .map(l => l.completed_date)
    .sort((a, b) => a.localeCompare(b));
  if (habitDates.length === 0) return 0;
  let best = 1, current = 1;
  for (let i = 1; i < habitDates.length; i++) {
    const prev = new Date(habitDates[i - 1]);
    const curr = new Date(habitDates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) { current++; best = Math.max(best, current); }
    else { current = 1; }
  }
  return best;
};

// Helper: generate heatmap data (last 365 days)
const generateHeatmapData = (logs) => {
  const countMap = {};
  logs.forEach(l => {
    countMap[l.completed_date] = (countMap[l.completed_date] || 0) + 1;
  });
  const days = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    days.push({ date: ds, count: countMap[ds] || 0 });
  }
  return days;
};

const HabitTrackerTab = ({
  habits, habitLogs, onAddHabit, onDeleteHabit, onToggleLog, loading
}) => {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('⭐');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newCategory, setNewCategory] = useState('General');
  const [aiInsight, setAiInsight] = useState('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().split('T')[0];
  const heatmapData = generateHeatmapData(habitLogs);
  const maxCount = Math.max(1, ...heatmapData.map(d => d.count));

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddHabit({ name: newName, icon: newIcon, color: newColor, category: newCategory });
    setNewName('');
  };

  const isLogged = (habitId, dateStr) => {
    return habitLogs.some(l => l.habit_id === habitId && l.completed_date === dateStr);
  };

  const getAiInsight = async () => {
    setAiInsightLoading(true);
    setAiInsight('');
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) { setAiInsight('Add your OpenAI API key to get AI insights.'); return; }

      const summary = habits.map(h => {
        const streak = computeStreak(h.id, habitLogs);
        const weekComplete = weekDates.filter(d => isLogged(h.id, d)).length;
        return `${h.icon} ${h.name}: ${weekComplete}/7 this week, ${streak}-day streak`;
      }).join('\n');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a habit coaching expert. Give a brief, encouraging 3-4 sentence weekly insight based on the user\'s habit data. Highlight wins, identify weak spots, and give one actionable tip. Use markdown formatting.' },
            { role: 'user', content: `My habits this week:\n${summary}` }
          ],
          temperature: 0.7
        })
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setAiInsight(data.choices[0].message.content.trim());
    } catch (e) {
      setAiInsight('Could not generate insight. Please try again.');
    } finally {
      setAiInsightLoading(false);
    }
  };

  const getHeatColor = (count) => {
    if (count === 0) return '#ebedf0';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return '#c6e48b';
    if (intensity < 0.5) return '#7bc96f';
    if (intensity < 0.75) return '#239a3b';
    return '#196127';
  };

  return (
    <div className="habits-tab fade-in">

      {/* Add New Habit Form */}
      <div className="habit-add-card glass-panel">
        <h3>Add a New Habit</h3>
        <div className="habit-add-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Habit name (e.g. Read 30 mins)..."
            className="habit-name-input"
          />
          <div className="habit-form-options">
            <div className="habit-icon-picker">
              <label>Icon</label>
              <div className="icon-options">
                {HABIT_ICONS.map(ic => (
                  <button key={ic} className={`icon-btn ${newIcon === ic ? 'selected' : ''}`}
                    onClick={() => setNewIcon(ic)}>{ic}</button>
                ))}
              </div>
            </div>
            <div className="habit-color-picker">
              <label>Color</label>
              <div className="color-options">
                {HABIT_COLORS.map(c => (
                  <button key={c} className={`color-btn ${newColor === c ? 'selected' : ''}`}
                    style={{ background: c }} onClick={() => setNewColor(c)} />
                ))}
              </div>
            </div>
            <div className="habit-category-picker">
              <label>Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="cat-select">
                {HABIT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAdd} className="btn btn-primary habit-add-btn" disabled={!newName.trim()}>
            <Plus size={16} /> Add Habit
          </button>
        </div>
      </div>

      {/* Week View Grid */}
      <div className="habit-week-card glass-panel">
        <h3>This Week</h3>
        {habits.length === 0 ? (
          <div className="empty-habits">No habits added yet. Create one above to start tracking!</div>
        ) : (
          <div className="habit-week-table-wrap">
            <table className="habit-week-table">
              <thead>
                <tr>
                  <th className="habit-name-col">Habit</th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} className={weekDates[i] === todayStr ? 'today-col' : ''}>{d}</th>
                  ))}
                  <th>🔥 Streak</th>
                  <th>⭐ Best</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => {
                  const streak = computeStreak(habit.id, habitLogs);
                  const best = computeBestStreak(habit.id, habitLogs);
                  return (
                    <tr key={habit.id}>
                      <td className="habit-name-cell">
                        <span className="habit-icon-badge" style={{ background: habit.color + '20', color: habit.color }}>{habit.icon}</span>
                        <span className="habit-label">{habit.name}</span>
                      </td>
                      {weekDates.map((ds, i) => {
                        const done = isLogged(habit.id, ds);
                        const isToday = ds === todayStr;
                        const isFuture = ds > todayStr;
                        return (
                          <td key={ds} className={`habit-cell ${isToday ? 'today-cell' : ''} ${isFuture ? 'future-cell' : ''}`}>
                            <button
                              className={`habit-check-btn ${done ? 'checked' : ''}`}
                              onClick={() => !isFuture && onToggleLog(habit.id, ds)}
                              disabled={isFuture}
                              style={done ? { color: habit.color } : {}}
                            >
                              {done ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="streak-cell">
                        <span className="streak-badge">{streak > 0 && <Flame size={14} />}{streak}d</span>
                      </td>
                      <td className="best-cell">
                        <span className="best-badge">{best}d</span>
                      </td>
                      <td>
                        <button className="habit-delete-btn" onClick={() => onDeleteHabit(habit.id)} title="Delete habit">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 365-Day Heatmap */}
      {habits.length > 0 && (
        <div className="habit-heatmap-card glass-panel">
          <h3>365-Day Activity</h3>
          <div className="heatmap-grid">
            {heatmapData.map((d, i) => (
              <div
                key={i}
                className="heatmap-cell"
                style={{ background: getHeatColor(d.count) }}
                title={`${d.date}: ${d.count} habit${d.count !== 1 ? 's' : ''} completed`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            {['#ebedf0','#c6e48b','#7bc96f','#239a3b','#196127'].map(c => (
              <div key={c} className="heatmap-cell legend-cell" style={{ background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* AI Weekly Insight */}
      {habits.length > 0 && (
        <div className="habit-ai-card glass-panel">
          <div className="card-header">
            <div className="header-title">
              <Sparkles size={20} color="var(--accent)" />
              <h3>AI Weekly Insight</h3>
            </div>
            <span className="pill-badge-ai">GPT POWERED</span>
          </div>
          <button onClick={getAiInsight} disabled={aiInsightLoading} className="btn btn-primary ai-coach-btn">
            {aiInsightLoading ? <><Loader2 size={16} className="spinner" /> Analyzing...</> : <><Sparkles size={16} /> Get AI Habit Insight</>}
          </button>
          {aiInsight && (
            <div className="ai-insight-result fade-in">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HabitTrackerTab;
