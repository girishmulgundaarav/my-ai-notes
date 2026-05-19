# Implementation Plan — Habit Tracker Integrated into Daily Planner

Extend the existing `/planner` page to include a full Habit Tracker. The page will have two tabs at the top — **Daily Plan** and **Habits** — plus a compact Habit Check-In strip added to the right column of the Daily Plan tab for quick daily logging.

---

## Supabase Changes Required

> [!IMPORTANT]
> Run these SQL commands in your **Supabase → SQL Editor** before or after deployment. The app will fall back to `localStorage` gracefully if the tables don't exist yet.

### New Table 1: `habits`
Stores each user's defined habits (name, color, category, target days).

```sql
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text default 'General',
  color text default '#6366f1',
  icon text default '⭐',
  target_days text[] default array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  created_at timestamptz default timezone('utc'::text, now())
);

alter table public.habits enable row level security;
create policy "Users manage own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### New Table 2: `habit_logs`
Stores a record for every date a habit was completed.

```sql
create table public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_date date not null,
  unique (habit_id, completed_date)
);

alter table public.habit_logs enable row level security;
create policy "Users manage own habit logs" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Existing Table: `daily_plans`
✅ **No changes needed.** The existing schema is unchanged.

---

## Proposed Changes

### [MODIFY] [DailyPlannerPage.jsx](file:///Users/girishmulgund/Learnings/AI_Notes_project/src/pages/DailyPlannerPage.jsx)

#### What changes:
1. **Tab switcher** at the top of the page: `[ 📅 Daily Plan ]  [ 🏆 Habits ]`
2. **Compact Habit Strip** added to the right column of the Daily Plan tab — shows today's habits as quick-tap check-off pills
3. **Full Habits Tab** with:
   - Habit management (add/delete habits with name, icon, category, color, target days)
   - **Week view grid** — rows = habits, columns = Mon–Sun with ✅/❌ per cell
   - **Streak counter** per habit (current streak 🔥 + best ever ⭐)
   - **365-day heatmap** (GitHub-style calendar with color intensity by completion count)
   - **AI Weekly Summary** — GPT-generated insight on consistency patterns

#### New state added:
- `activeTab` — `'planner' | 'habits'`
- `habits` — array of habit definitions
- `habitLogs` — array of `{ habit_id, completed_date }` records (last 365 days)
- `newHabitName`, `newHabitIcon`, `newHabitColor`, `newHabitCategory` — add form fields

#### New handlers added:
- `fetchHabits(userId)` — loads habits from Supabase / localStorage fallback
- `fetchHabitLogs(userId)` — loads last 365 days of logs
- `handleAddHabit()` — inserts into `habits` table
- `handleDeleteHabit(id)` — removes habit and its logs
- `handleToggleHabitLog(habitId, dateStr)` — inserts or deletes a log for a given date
- `computeStreak(habitId)` — calculates current consecutive day streak
- `computeBestStreak(habitId)` — calculates all-time best streak
- `getAiHabitSummary()` — sends habit completion stats to OpenAI for a weekly insight

---

### [MODIFY] [DailyPlannerPage.css](file:///Users/girishmulgund/Learnings/AI_Notes_project/src/styles/DailyPlannerPage.css)

#### What's added:
- Tab switcher styles (pill-style active/inactive states with smooth underline transition)
- Compact habit strip styles for the Daily Plan right column
- Habit card styles (color-coded left border accent, streak badge)
- Week grid table styles (compact cells with hover and completed states)
- Heatmap grid (52×7 tiny colored squares with tooltip on hover)
- Streak badge animations

---

## Visual Layout

### Tab 1 — Daily Plan (existing + compact habit strip)
```
[ 📅 Daily Plan ]  [ 🏆 Habits ]

Left Column:                Right Column:
┌─────────────────┐        ┌──────────────────┐
│ Time Blocking   │        │ AI Schedule Coach│
│ Timeline Grid   │        │ Daily Intentions │
│ 07 AM → 10 PM   │        │ Water Tracker    │
│                 │        │ Mood Log         │
│                 │        │──────────────────│
│                 │        │ 🆕 Today's Habits │
│                 │        │ [Read ✅][Run ⬜] │
└─────────────────┘        └──────────────────┘
```

### Tab 2 — Habits
```
[ 📅 Daily Plan ]  [ 🏆 Habits ]

┌─ Add New Habit ─────────────────────────┐
│ [Name] [Icon] [Color] [Category] [+ Add]│
└─────────────────────────────────────────┘

┌─ This Week ─────────────────────────────┐
│ Habit        Mon Tue Wed Thu Fri Sat Sun │ 🔥 Streak  ⭐ Best
│ Read 📚       ✅  ✅  ✅  ❌  ✅  ✅  ⬜  │ 5 days     12 days
│ Exercise 🏃   ✅  ❌  ✅  ✅  ✅  ⬜  ⬜  │ 3 days     21 days
└─────────────────────────────────────────┘

┌─ 365-Day Heatmap ───────────────────────┐
│  Jan Feb Mar ... Dec                    │
│  ░░▒▒▓▓██ ░░▒▒▓▓██ ...                 │
└─────────────────────────────────────────┘

┌─ AI Weekly Insight ─────────────────────┐
│ 🤖 "You completed 78% of habits this    │
│ week. Your reading streak is impressive!│
│ Try scheduling Exercise at 7 AM..."     │
└─────────────────────────────────────────┘
```

---

## Verification Plan

### Supabase Tables
1. Run all 4 SQL blocks (create + RLS for both tables)
2. Confirm tables appear in Supabase → Table Editor

### Manual Verification
1. Open `/planner` → verify tab switcher appears
2. **Tab 1**: verify compact habit strip appears in right column, habits are tappable
3. **Tab 2**: Add 2–3 habits → verify they appear in the week grid
4. Check off habits across Mon–Sun → verify ✅ cells update and streak counter increments
5. Click "Get AI Habit Insight" → verify GPT summary appears
6. Verify heatmap renders with colored squares
7. Delete a habit → verify it disappears from grid and heatmap
8. Refresh page → confirm all data persists (cloud or localStorage)
