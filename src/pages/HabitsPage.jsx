import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HabitTrackerTab from './HabitTrackerTab';
import { Trophy, Database, Lock } from 'lucide-react';
import '../styles/DailyPlannerPage.css';

const HabitsPage = () => {
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Syncing...');

  // Load habits and habit logs on mount
  useEffect(() => {
    loadHabitData();
  }, []);

  const loadHabitData = async () => {
    setLoading(true);
    setSyncStatus('Syncing...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus('Not Authenticated');
        setLoading(false);
        return;
      }
      await fetchHabits(user.id);
      await fetchHabitLogs(user.id);
      setSyncStatus('Synced to Cloud');
    } catch (e) {
      console.warn('Habit data load error, falling back to LocalStorage:', e);
      setSyncStatus('Saved Locally');
    } finally {
      setLoading(false);
    }
  };

  const fetchHabits = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setHabits(data || []);
    } catch (e) {
      const local = localStorage.getItem(`habits_${uid}`);
      setHabits(local ? JSON.parse(local) : []);
    }
  };

  const fetchHabitLogs = async (uid) => {
    try {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', uid)
        .gte('completed_date', yearAgo.toISOString().split('T')[0]);
      if (error) throw error;
      setHabitLogs(data || []);
    } catch (e) {
      const local = localStorage.getItem(`habit_logs_${uid}`);
      setHabitLogs(local ? JSON.parse(local) : []);
    }
  };

  const handleAddHabit = async ({ name, icon, color, category }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('habits').insert({ name, icon, color, category, user_id: user.id });
      if (error) throw error;
      await fetchHabits(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`habits_${user.id}`);
        const list = local ? JSON.parse(local) : [];
        list.push({ id: 'local_' + Date.now(), name, icon, color, category, user_id: user.id, created_at: new Date().toISOString() });
        localStorage.setItem(`habits_${user.id}`, JSON.stringify(list));
        setHabits(list);
      }
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: logError } = await supabase.from('habit_logs').delete().eq('habit_id', habitId);
      if (logError) throw logError;
      const { error } = await supabase.from('habits').delete().eq('id', habitId);
      if (error) throw error;
      await fetchHabits(user.id);
      await fetchHabitLogs(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`habits_${user.id}`);
        if (local) {
          const list = JSON.parse(local).filter(h => h.id !== habitId);
          localStorage.setItem(`habits_${user.id}`, JSON.stringify(list));
          setHabits(list);
        }
        const logLocal = localStorage.getItem(`habit_logs_${user.id}`);
        if (logLocal) {
          const logs = JSON.parse(logLocal).filter(l => l.habit_id !== habitId);
          localStorage.setItem(`habit_logs_${user.id}`, JSON.stringify(logs));
          setHabitLogs(logs);
        }
      }
    }
  };

  const handleToggleHabitLog = async (habitId, dateStr) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const existing = habitLogs.find(l => l.habit_id === habitId && l.completed_date === dateStr);
      if (existing) {
        const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: user.id, completed_date: dateStr });
        if (error) throw error;
      }
      await fetchHabitLogs(user.id);
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const local = localStorage.getItem(`habit_logs_${user.id}`);
        let logs = local ? JSON.parse(local) : [];
        const idx = logs.findIndex(l => l.habit_id === habitId && l.completed_date === dateStr);
        if (idx >= 0) {
          logs.splice(idx, 1);
        } else {
          logs.push({ id: 'local_' + Date.now(), habit_id: habitId, user_id: user.id, completed_date: dateStr });
        }
        localStorage.setItem(`habit_logs_${user.id}`, JSON.stringify(logs));
        setHabitLogs(logs);
      }
    }
  };

  return (
    <div className="planner-page habits-page fade-in">
      {/* Page Header */}
      <header className="planner-header glass-panel">
        <div className="header-meta">
          <div className="planner-badge" style={{ background: 'rgba(168, 85, 247, 0.08)', color: 'var(--accent)' }}>
            <Trophy size={14} />
            <span>HABIT TRACKER</span>
          </div>
          <div className={`sync-status ${syncStatus.toLowerCase().replace(/\s/g, '-')}`}>
            <span className="dot"></span>
            {syncStatus === 'Synced to Cloud' ? <Database size={12} /> : <Lock size={12} />}
            <span>{syncStatus}</span>
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>My Habits</h2>
        </div>
      </header>

      {/* Habits Content */}
      <HabitTrackerTab
        habits={habits}
        habitLogs={habitLogs}
        onAddHabit={handleAddHabit}
        onDeleteHabit={handleDeleteHabit}
        onToggleLog={handleToggleHabitLog}
        loading={loading}
      />
    </div>
  );
};

export default HabitsPage;
