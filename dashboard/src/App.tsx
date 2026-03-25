import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/overview/OverviewPage';
import { LogsPage } from '@/pages/logs/LogsPage';
import { AssistantPage } from '@/pages/assistant/AssistantPage';
import { JourneysPage } from '@/pages/journeys/JourneysPage';
import { JourneyTimeline } from '@/pages/journeys/JourneyTimeline';
import { ErrorsPage } from '@/pages/errors/ErrorsPage';
import { DeploymentsPage } from '@/pages/deployments/DeploymentsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { AlertsPage } from '@/pages/settings/AlertsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
