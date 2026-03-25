import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';

const OverviewPage = lazy(() => import('@/pages/overview/OverviewPage').then(m => ({ default: m.OverviewPage })));
const LogsPage = lazy(() => import('@/pages/logs/LogsPage').then(m => ({ default: m.LogsPage })));
const AssistantPage = lazy(() => import('@/pages/assistant/AssistantPage').then(m => ({ default: m.AssistantPage })));
const JourneysPage = lazy(() => import('@/pages/journeys/JourneysPage').then(m => ({ default: m.JourneysPage })));
const JourneyTimeline = lazy(() => import('@/pages/journeys/JourneyTimeline').then(m => ({ default: m.JourneyTimeline })));
const ErrorsPage = lazy(() => import('@/pages/errors/ErrorsPage').then(m => ({ default: m.ErrorsPage })));
const DeploymentsPage = lazy(() => import('@/pages/deployments/DeploymentsPage').then(m => ({ default: m.DeploymentsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AlertsPage = lazy(() => import('@/pages/settings/AlertsPage').then(m => ({ default: m.AlertsPage })));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Auth routes (no AppShell) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Dashboard routes (with AppShell) */}
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/journeys" element={<JourneysPage />} />
              <Route path="/journeys/:userId" element={<JourneyTimeline />} />
              <Route path="/errors" element={<ErrorsPage />} />
              <Route path="/deployments" element={<DeploymentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/alerts" element={<AlertsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
