import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Login } from './Login';

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  confirmSignIn: vi.fn(),
}));

import { signIn, confirmSignIn } from 'aws-amplify/auth';

const mockSignIn = vi.mocked(signIn);
const mockConfirmSignIn = vi.mocked(confirmSignIn);

function renderLogin(
  initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/login'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/inventory" element={<div>Inventory Home</div>} />
        <Route path="/inventory/:id" element={<div>Spool Detail Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function enterAndSendCode(digits: string) {
  const boxes = screen.getAllByRole('textbox');
  digits.split('').forEach((digit, i) => fireEvent.change(boxes[i], { target: { value: digit } }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue({
    isSignedIn: false,
    nextStep: {
      signInStep: 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE',
      codeDeliveryDetails: { destination: 'jo***@example.com' },
    },
  } as never);
});

describe('Login', () => {
  it('submits the lowercased, trimmed email and moves to the code step', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  Jo@Example.com  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'jo@example.com',
        options: { authFlowType: 'USER_AUTH', preferredChallenge: 'EMAIL_OTP' },
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
  });

  it('shows a direct error when the email has no account', async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error('nope'), { name: 'UserNotFoundException' }),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText('No account found for that email.')).toBeInTheDocument();
  });

  it('confirms a valid code and navigates to /inventory by default', async () => {
    mockConfirmSignIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    } as never);
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });

    enterAndSendCode('41928374');

    await waitFor(() =>
      expect(mockConfirmSignIn).toHaveBeenCalledWith({ challengeResponse: '41928374' }),
    );
    expect(await screen.findByText('Inventory Home')).toBeInTheDocument();
  });

  it('returns to the originally-requested page after a valid code', async () => {
    mockConfirmSignIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    } as never);
    renderLogin([{ pathname: '/login', state: { from: { pathname: '/inventory/spool-1' } } }]);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });

    enterAndSendCode('41928374');

    expect(await screen.findByText('Spool Detail Page')).toBeInTheDocument();
  });

  it('shows an error and stays on the code step for a wrong code', async () => {
    mockConfirmSignIn.mockRejectedValue(
      Object.assign(new Error('bad'), { name: 'CodeMismatchException' }),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });

    enterAndSendCode('41928374');

    expect(await screen.findByText(/code's wrong or expired/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
  });

  it('disables resend for 30s, then allows resending', async () => {
    // Fake timers must be active before the interval is created (i.e. before
    // the code step's countdown starts), so this avoids RTL's real-time-based
    // findBy*/waitFor entirely -- flush pending promises via act() instead.
    vi.useFakeTimers();

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByRole('button', { name: /resend/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('lets the user go back and try a different email', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });

    fireEvent.click(screen.getByRole('button', { name: /use a different email/i }));

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
});
