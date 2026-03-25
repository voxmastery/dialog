import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AmbientGlow } from '../ui/AmbientGlow';
import { ErrorBoundary } from '../ErrorBoundary';

export function AppShell() {
  return (
    <div className="min-h-screen relative font-sans antialiased">
      <AmbientGlow />
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
