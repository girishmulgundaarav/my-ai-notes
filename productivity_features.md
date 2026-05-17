# 🎓 AI Productivity Suite: Reading, Education, and Study Widgets

This guide outlines advanced, premium productivity features you can add to your **AI Notes** app to transform it into the ultimate study and education dashboard.

---

## 1. ⏱️ Interactive Pomodoro Focus Timer
A highly requested study companion that helps users maintain focus using the 25/5 Pomodoro method.

### How it Works:
- **UI:** A gorgeous circular progress ring showing time ticking down (e.g. `25:00`).
- **Interactive Controls:** Play, Pause, Reset buttons, and presets for `Focus (25m)`, `Short Break (5m)`, and `Long Break (15m)`.
- **Supabase Integration:** When a focus session finishes, it logs `25 focus minutes` under a `focus_logs` table in Supabase. The Home Page then displays your total weekly focus hours!

### Core React Timer State Template:
```jsx
const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(1500); // 25 minutes
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Trigger a browser alarm sound and log to Supabase!
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
};
```

---

## 2. 📝 Quick Tasks Checklist with "AI Sub-Task Breakdowns"
A highly-polished to-do list widget with AI capabilities.

### The AI Twist (AI Sub-Task Breakdown):
Next to each task, add a small **Sparkles** icon. When clicked, it reads the task title (e.g., *"Study Chapter 4 Biology"*) and calls OpenAI to **break the task down into 3 manageable action items** (e.g., *"1. Outline key terms, 2. Draw the cell diagram, 3. Take active recall quiz"*).

### Suggested Supabase Table:
```sql
CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  sub_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

---

## 3. 📚 Reading Tracker & Book Log
Track books, articles, or lecture notes you are reading alongside progress percentages.

### How it Works:
- **UI:** Render a list of active books with progress bars (e.g., `Page 140 of 300` - `46% complete`).
- **Educational Integration:** You can link a book directly to one of your existing AI Notes. Clicking the book opens your consolidated study note or AI-generated summary of that book!

---

## 4. 💡 Active Recall AI Flashcards Deck
Flipped cards for memorization, generated automatically from your personal notes.

### How it Works:
- **UI:** Flashcards that flip 3D on hover or click (`transform: rotateY(180deg)`), showing the question on the front and answer on the back.
- **AI Twist:** Add a button **"Generate study deck from this note"**. The AI reads your note content, extracts key definitions and concepts, and generates 5 flashcards instantly!

### CSS for 3D Flipping Card:
```css
.flashcard-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flashcard:hover .flashcard-inner {
  transform: rotateY(180deg);
}
.front, .back {
  position: absolute;
  backface-visibility: hidden;
}
.back {
  transform: rotateY(180deg);
}
```

---

## 📅 Suggested Layout Integration:
To organize these features without cluttering your interface, you can add a **Tabbed Toggle** right in the middle of your right column:
1. **Tabs:** `[ 📝 To-Do ]` `[ ⏱️ Focus ]` `[ 📚 Reading ]`
2. Selecting **To-Do** displays your interactive AI-powered checklist.
3. Selecting **Focus** switches the card into the circular Pomodoro focus timer.
4. Selecting **Reading** opens your active book log.

This keeps your dashboard extremely clean, visually cohesive, and packed with incredible utility!
