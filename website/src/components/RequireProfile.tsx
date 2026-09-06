import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useUser } from '../api/user';
import { useThemeStore } from '../stores/themeStore';
import { PageShell } from './PageShell';
import { LoadingSpool } from './LoadingSpool';

export interface RequireProfileProps {
  children: ReactNode;
}

export function RequireProfile({ children }: RequireProfileProps) {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState(false);
  const userQuery = useUser();
  const setTheme = useThemeStore((state) => state.setTheme);
  const fetchedTheme = userQuery.data?.preferences.theme;

  useEffect(() => {
    if (fetchedTheme) {
      setTheme(fetchedTheme);
    }
  }, [fetchedTheme, setTheme]);

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
        setAuthError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authError) {
    return (
      <PageShell centered>Something went wrong signing you in. Please refresh the page.</PageShell>
    );
  }

  if (authenticated === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (authenticated === null || userQuery.isLoading) {
    return (
      <PageShell centered>
        <LoadingSpool message="Loading…" />
      </PageShell>
    );
  }

  if (userQuery.isError) {
    return (
      <PageShell centered>
        Something went wrong loading your profile. Please refresh the page.
      </PageShell>
    );
  }

  if (userQuery.data === null) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}
