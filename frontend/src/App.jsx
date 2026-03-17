import { Suspense, lazy, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import SplashScreen from './components/SplashScreen';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const Upload = lazy(() => import('./pages/Upload'));
const AIChat = lazy(() => import('./pages/AIChat'));
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

// Full-screen page loading spinner
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Splash — shown once on every fresh page load */}
        {!splashDone && <SplashScreen onDone={handleSplashDone} />}

        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'var(--toast-bg, #fff)',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
                },
              }}
            />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes (no sidebar) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes (inside AppLayout with sidebar) */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/upload" element={
                    <ProtectedRoute roles={['staff', 'hod', 'admin']}><Upload /></ProtectedRoute>
                  } />
                  <Route path="/ai-chat" element={<AIChat />} />
                  <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
