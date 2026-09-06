import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'members', label: 'Members' },
  ];

  it('marks the active tab as selected', () => {
    renderWithProviders(<Tabs tabs={tabs} activeId="general" onChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    renderWithProviders(<Tabs tabs={tabs} activeId="general" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Members' }));
    expect(onChange).toHaveBeenCalledWith('members');
  });
});
