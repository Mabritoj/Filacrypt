import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert', () => {
  it('announces errors assertively', () => {
    render(<Alert tone="error">Something went wrong.</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it.each(['warning', 'success', 'info'] as const)('announces %s politely', (tone) => {
    render(<Alert tone={tone}>Heads up</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Heads up');
  });
});
