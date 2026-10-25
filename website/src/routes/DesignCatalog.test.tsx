import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { DesignCatalog } from './DesignCatalog';

describe('DesignCatalog', () => {
  it('renders every primitive in both themes', () => {
    renderWithProviders(<DesignCatalog />);
    expect(screen.getByRole('heading', { name: 'dark theme' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'light theme' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Primary' })).toHaveLength(2);
    expect(screen.getAllByRole('progressbar', { name: 'Remaining' })).toHaveLength(2);
  });
});
