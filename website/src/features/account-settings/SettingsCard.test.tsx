import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsCard } from './SettingsCard';

describe('SettingsCard', () => {
  it('renders the title, description, and children', () => {
    render(
      <SettingsCard title="Units & display" description="How measurements appear.">
        <p>Card content</p>
      </SettingsCard>,
    );

    expect(screen.getByText('Units & display')).toBeInTheDocument();
    expect(screen.getByText('How measurements appear.')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders without a description', () => {
    render(
      <SettingsCard title="Danger zone">
        <p>Card content</p>
      </SettingsCard>,
    );

    expect(screen.getByText('Danger zone')).toBeInTheDocument();
    expect(screen.queryByText('How measurements appear.')).not.toBeInTheDocument();
  });
});
