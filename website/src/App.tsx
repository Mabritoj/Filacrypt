import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Landing } from './features/landing/Landing';
import { Login } from './features/auth/Login';
import { ComingSoon } from './routes/ComingSoon';
import { RequireAuth } from './components/RequireAuth';
import { AuthenticatedLayout } from './routes/AuthenticatedLayout';
import { PageShell } from './components/PageShell';
import { LoadingSpool } from './components/LoadingSpool';
import { useThemeStore } from './stores/themeStore';
import './index.css';

const Setup = lazy(() => import('./features/setup/Setup').then((m) => ({ default: m.Setup })));
const InventoryHome = lazy(() =>
  import('./features/inventory/InventoryHome').then((m) => ({ default: m.InventoryHome })),
);
const FilamentDetail = lazy(() =>
  import('./features/filament-detail/FilamentDetail').then((m) => ({
    default: m.FilamentDetail,
  })),
);
const ScanSpool = lazy(() =>
  import('./features/scan-spool/ScanSpool').then((m) => ({ default: m.ScanSpool })),
);
const AccountSettings = lazy(() =>
  import('./features/account-settings/AccountSettings').then((m) => ({
    default: m.AccountSettings,
  })),
);

const queryClient = new QueryClient();

export function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <PageShell centered>
              <LoadingSpool message="Loading…" />
            </PageShell>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/setup"
              element={
                <RequireAuth>
                  <Setup />
                </RequireAuth>
              }
            />
            <Route element={<AuthenticatedLayout />}>
              <Route path="/inventory" element={<InventoryHome />} />
              <Route path="/inventory/:id" element={<FilamentDetail />} />
              <Route path="/scan" element={<ScanSpool />} />
              <Route path="/account" element={<AccountSettings />} />
            </Route>
            <Route path="*" element={<ComingSoon />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
