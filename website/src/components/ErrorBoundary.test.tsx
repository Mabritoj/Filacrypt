import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

function renderBoundary(ui: ReactNode, props: Partial<ErrorBoundaryProps> = {}) {
  return render(
    <MemoryRouter>
      <ErrorBoundary {...props}>{ui}</ErrorBoundary>
    </MemoryRouter>,
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React and the boundary both log caught errors; keep test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders children when nothing throws', () => {
    renderBoundary(<p>All good</p>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows the error and a reload button instead of a blank page', () => {
    renderBoundary(<Boom message="Cannot read properties of undefined" />);
    expect(screen.getByRole('heading', { name: 'Something went wrong.' })).toBeInTheDocument();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('reloads for a failed chunk download and shows progress meanwhile', () => {
    const onChunkLoadError = vi.fn(() => true);
    renderBoundary(<Boom message="Failed to fetch dynamically imported module: /x.js" />, {
      onChunkLoadError,
    });
    expect(onChunkLoadError).toHaveBeenCalled();
    expect(screen.getByText('Updating…')).toBeInTheDocument();
  });

  it('explains a chunk failure when it already reloaded once', () => {
    renderBoundary(<Boom message="Failed to fetch dynamically imported module: /x.js" />, {
      onChunkLoadError: () => false,
    });
    expect(screen.getByText(/failed to download/)).toBeInTheDocument();
  });

  it('does not treat ordinary errors as chunk failures', () => {
    const onChunkLoadError = vi.fn(() => true);
    renderBoundary(<Boom message="boom" />, { onChunkLoadError });
    expect(onChunkLoadError).not.toHaveBeenCalled();
  });

  it('recovers when the reset key changes, e.g. on navigation', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKey="/inventory">
          <Boom message="boom" />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong.' })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKey="/account">
          <p>Account page</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Account page')).toBeInTheDocument();
  });
});
