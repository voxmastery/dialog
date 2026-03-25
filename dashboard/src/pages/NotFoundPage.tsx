import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AmbientGlow } from '@/components/ui/AmbientGlow';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] relative">
      <AmbientGlow />

      {/* Terminal mockup */}
      <div className="code-block rounded-xl p-6 w-full max-w-lg font-mono text-sm mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-2 text-xs text-gray-600">terminal</span>
        </div>
        <div className="space-y-2">
          <p className="text-gray-400">
            <span className="text-indigo-400">$</span> dialog ask <span className="text-green-400">&apos;where is this page?&apos;</span>
          </p>
          <p className="text-yellow-400">
            &#x26A0; 404 &mdash; This endpoint returned nothing.
          </p>
          <p className="text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm mb-8">
        Check the URL or head back to the dashboard.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" size="md">
            Go to Dashboard
          </Button>
        </Link>
        <Button variant="ghost" size="md" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
