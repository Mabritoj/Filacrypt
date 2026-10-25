import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { TabPanel, Tabs } from './Tabs';

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

  it('switches tabs with the arrow keys and makes only the active tab a tab stop', () => {
    const onChange = vi.fn();
    renderWithProviders(<Tabs tabs={tabs} activeId="general" onChange={onChange} />);

    const general = screen.getByRole('tab', { name: 'General' });
    expect(general).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(general, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('members');
  });

  it('links tabs to their panel when given an id', () => {
    renderWithProviders(
      <>
        <Tabs id="account" tabs={tabs} activeId="general" onChange={vi.fn()} />
        <TabPanel tabsId="account" tabId="general">
          General settings
        </TabPanel>
      </>,
    );

    const panel = screen.getByRole('tabpanel', { name: 'General' });
    expect(panel).toHaveTextContent('General settings');
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-controls', panel.id);
  });
});
