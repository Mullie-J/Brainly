import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Setup from '@/pages/Setup';
import Today from '@/pages/Today';
import AllTodos from '@/pages/AllTodos';
import ProjectsList from '@/pages/ProjectsList';

// Heavy / less-used pages — lazy-loaded so the initial bundle stays small.
// NotePage + ProjectDetail pull in BlockNote (~1 MB) which dominates the bundle.
const NotePage = lazy(() => import('@/pages/Note'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Agenda = lazy(() => import('@/pages/Agenda'));
const AllNotes = lazy(() => import('@/pages/AllNotes'));
const Review = lazy(() => import('@/pages/Review'));
const WeeklyReview = lazy(() => import('@/pages/WeeklyReview'));
const Habits = lazy(() => import('@/pages/Habits'));
const Stats = lazy(() => import('@/pages/Stats'));

export default function App() {
  useApplyTheme();
  if (!isSupabaseConfigured) return <Setup />;

  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Today />} />
        <Route path="/todos" element={<AllTodos />} />
        <Route path="/inbox" element={<Navigate to="/todos" replace />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/agenda" element={withSuspense(<Agenda />)} />
        <Route path="/review" element={withSuspense(<Review />)} />
        <Route path="/weekly-review" element={withSuspense(<WeeklyReview />)} />
        <Route path="/habits" element={withSuspense(<Habits />)} />
        <Route path="/stats" element={withSuspense(<Stats />)} />
        <Route path="/notes" element={withSuspense(<AllNotes />)} />
        <Route path="/p/:projectId" element={withSuspense(<ProjectDetail />)} />
        <Route path="/p/:projectId/n/:noteId" element={withSuspense(<NotePage />)} />
        <Route path="/n/:noteId" element={withSuspense(<NotePage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function withSuspense(node: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      }
    >
      {node}
    </Suspense>
  );
}
