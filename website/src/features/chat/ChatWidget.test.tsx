import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatWidget } from './ChatWidget';
import spinStyles from '../../components/spoolSpin.module.css';

const mockSend = vi.fn();
let mockState = { messages: [] as unknown[], isStreaming: false, error: null as string | null };

vi.mock('./useChatStream', () => ({
  useChatStream: () => ({ ...mockState, send: mockSend }),
}));
vi.mock('../../hooks/useWorkspaceId', () => ({ useWorkspaceId: () => 'ws-1' }));
vi.mock('../../api/spools', () => ({
  useSpools: () => ({
    data: [
      {
        id: 'sp-1',
        brand: 'Prusament',
        materialType: 'PLA',
        materialName: 'Galaxy Black',
        colorHex: '#000000',
        tags: [],
        netWeightG: 1000,
        remainingWeightG: 720,
        filamentDiameterMm: 1.75,
        status: 'in_use',
        workspaceId: 'ws-1',
        addedBy: 'u',
        createdAt: '',
        updatedAt: '',
      },
    ],
  }),
}));
vi.mock('../../api/workspace', () => ({
  useWorkspace: () => ({ data: { lowStockThresholdG: 200 } }),
}));
vi.mock('../../api/user', () => ({ usePreferences: () => ({ weightUnit: 'g' }) }));

function renderWidget() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockState = { messages: [], isStreaming: false, error: null };
});

describe('ChatWidget', () => {
  test('renders without crashing', () => {
    renderWidget();
    expect(
      screen.getByRole('button', { name: /open inventory assistant chat/i }),
    ).toBeInTheDocument();
  });

  test('opens the panel when the badge is clicked', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open inventory assistant chat/i }));
    expect(screen.getByRole('textbox', { name: /ask a question/i })).toBeInTheDocument();
  });

  test('closes the panel when the badge is clicked while open', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open inventory assistant chat/i }));
    expect(screen.getByRole('textbox', { name: /ask a question/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close inventory assistant chat/i }));
    expect(screen.queryByRole('textbox', { name: /ask a question/i })).not.toBeInTheDocument();
  });

  test('sends the typed question', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open inventory assistant chat/i }));
    const input = screen.getByRole('textbox', { name: /ask a question/i });
    fireEvent.change(input, { target: { value: 'what black filament?' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockSend).toHaveBeenCalledWith('what black filament?');
  });

  test('renders a spool card for a referenced id', () => {
    mockState.messages = [
      { role: 'user', text: 'black?', spoolIds: [] },
      { role: 'assistant', text: 'One match.', spoolIds: ['sp-1'] },
    ];
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open inventory assistant chat/i }));
    expect(screen.getByText('Galaxy Black')).toBeInTheDocument();
  });

  test('shows an error message', () => {
    mockState.error = 'boom';
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open inventory assistant chat/i }));
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  test('spins the badge icon while streaming', () => {
    mockState.isStreaming = true;
    renderWidget();
    const badge = screen.getByRole('button', { name: /open inventory assistant chat/i });
    expect(badge.querySelector('svg')).toHaveClass(spinStyles.spin);
  });

  test('does not spin the badge icon when idle', () => {
    renderWidget();
    const badge = screen.getByRole('button', { name: /open inventory assistant chat/i });
    expect(badge.querySelector('svg')).not.toHaveClass(spinStyles.spin);
  });
});
