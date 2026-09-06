import { expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletionImpactModal } from './DeletionImpactModal';
import { mockDeletionImpact } from '../../api/mock/deletionImpact';

test('lists each workspace and defaults to no selection', () => {
  render(
    <DeletionImpactModal
      workspaces={mockDeletionImpact}
      onResolved={() => {}}
      onCancel={() => {}}
    />,
  );

  expect(screen.getByText("Grace's Garage")).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
});

test('choosing "delete workspace" enables continue and resolves with a delete action', () => {
  const onResolved = vi.fn();
  render(
    <DeletionImpactModal
      workspaces={mockDeletionImpact}
      onResolved={onResolved}
      onCancel={() => {}}
    />,
  );

  fireEvent.click(screen.getByRole('radio', { name: /delete this workspace/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));

  expect(onResolved).toHaveBeenCalledWith({ 'ws-2': { action: 'delete' } });
});

test('choosing "reassign to" a specific member resolves with that member\'s id', () => {
  const onResolved = vi.fn();
  render(
    <DeletionImpactModal
      workspaces={mockDeletionImpact}
      onResolved={onResolved}
      onCancel={() => {}}
    />,
  );

  fireEvent.click(screen.getByRole('radio', { name: /reassign to/i }));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user-3' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));

  expect(onResolved).toHaveBeenCalledWith({ 'ws-2': { action: 'reassign', newOwnerId: 'user-3' } });
});

test('cancel calls onCancel', () => {
  const onCancel = vi.fn();
  render(
    <DeletionImpactModal
      workspaces={mockDeletionImpact}
      onResolved={() => {}}
      onCancel={onCancel}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

  expect(onCancel).toHaveBeenCalled();
});
