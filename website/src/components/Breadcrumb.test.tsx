import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renders intermediate items as links and the last item as plain text', () => {
    renderWithProviders(
      <Breadcrumb items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Galaxy Black' }]} />,
    );

    const inventoryLink = screen.getByRole('link', { name: 'Inventory' });
    expect(inventoryLink).toHaveAttribute('href', '/inventory');
    expect(screen.getByText('Galaxy Black')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Galaxy Black' })).not.toBeInTheDocument();
  });

  it('renders a mobile back link to the last item with a `to` before the current one', () => {
    renderWithProviders(
      <Breadcrumb items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Galaxy Black' }]} />,
    );

    const backLink = screen.getByRole('link', { name: 'Back to Inventory' });
    expect(backLink).toHaveAttribute('href', '/inventory');
  });

  it('renders no mobile back link when no earlier item has a `to`', () => {
    renderWithProviders(<Breadcrumb items={[{ label: 'Add Spool' }]} />);

    expect(screen.queryByRole('link', { name: /^Back to/ })).not.toBeInTheDocument();
  });
});
