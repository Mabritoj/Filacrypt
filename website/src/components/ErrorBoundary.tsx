import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '../utils/chunkReload';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { LoadingSpool } from './LoadingSpool';
import { PageShell } from './PageShell';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** When this changes (e.g. the route), a caught error is cleared and children render again. */
  resetKey?: string;
  /** Injected in tests; defaults to reloading the page at most once per cooldown. */
  onChunkLoadError?: () => boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** The boundary triggered a reload for a failed chunk; show a spinner until it happens. */
  reloading: boolean;
  resetKey?: string;
}

/**
 * Catches render errors below it so the app shows a message instead of going
 * blank (React unmounts the whole tree on an uncaught render error). A failed
 * lazy-chunk download reloads the page once, since a fresh load fixes it.
 *
 * A class component on purpose -- the one exception to "functional components
 * only": React has no hook equivalent of getDerivedStateFromError/
 * componentDidCatch, and react-error-boundary would be a new dependency.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, reloading: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, reloading: false, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error', error, info.componentStack);
    if (isChunkLoadError(error)) {
      const reloaded = (this.props.onChunkLoadError ?? reloadOnceForChunkError)();
      if (reloaded) this.setState({ reloading: true });
    }
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    if (reloading) {
      return (
        <PageShell centered>
          <LoadingSpool message="Updating…" />
        </PageShell>
      );
    }

    return (
      <PageShell centered>
        <EmptyState
          title="Something went wrong."
          titleAs="h1"
          action={<Button onClick={() => window.location.reload()}>Reload page</Button>}
        >
          {isChunkLoadError(error)
            ? 'Part of the app failed to download. Check your connection, then reload.'
            : 'The page hit an unexpected error. Reloading usually fixes it.'}
        </EmptyState>
        <pre className={styles.details}>{error.message}</pre>
      </PageShell>
    );
  }
}
