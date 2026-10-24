import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('explains the page is not built and links home', () => {
    renderWithProviders(<ComingSoon />);
    expect(
      screen.getByRole('heading', { level: 1, name: "This page isn't built yet." }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Filacrypt' })).toHaveAttribute('href', '/');
  });
});
