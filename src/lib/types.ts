export type ProjectStatus = 'active' | 'on_hold' | 'done' | 'archived';
export type TodoStatus = 'todo' | 'doing' | 'done';
export type Priority = 1 | 2 | 3;
export type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type Scope = 'work' | 'personal';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;       // ISO date
  north_star: string | null;
  links: ProjectLink[];
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  due_date: string | null;
  start_time: string | null;     // "HH:MM:SS" or "HH:MM"
  duration_min: number | null;
  effort_min: number | null;     // estimated effort (planning, not scheduling)
  recurrence_type: RecurrenceType | null;
  scope: Scope;
  source_note_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  project_id: string | null;
  todo_id: string | null;
  title: string;
  content: unknown | null;       // BlockNote JSON document
  body_text: string | null;      // plain-text extraction for search
  tldr: string | null;
  last_reviewed_at: string | null;
  review_interval_days: number;
  review_enabled: boolean;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export type HabitColor = 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  emoji: string | null;
  color: HabitColor;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  went_well: string | null;
  time_wasters: string | null;
  carry_over: string | null;
  next_week_top3: Record<string, string[]>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;                  // YYYY-MM-DD
  top3_todo_ids: string[];
  shutdown_note: string | null;
  next_day_top3: string[];
  created_at: string;
  updated_at: string;
}
