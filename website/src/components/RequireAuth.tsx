import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { PageShell } from './PageShell';
import { LoadingSpool } from './LoadingSpool';

export interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchAuthSession()
      .then((session) => {
        if (cancelled) return;
        setAuthenticated(!!session.tokens);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('fetchAuthSession failed', err);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <PageShell centered>Something went wrong signing you in. Please refresh the page.</PageShell>
    );
  }

  if (authenticated === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (authenticated === null) {
    return (
      <PageShell centered>
        <LoadingSpool message="Loading…" />
      </PageShell>
    );
  }

  return <>{children}</>;
}
