import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('aws-amplify', () => ({
  Amplify: { configure: vi.fn() },
}));

import { Amplify } from 'aws-amplify';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('amplify config', () => {
  it('configures Amplify with just the Cognito user pool, no OAuth/Hosted UI settings', async () => {
    await import('./amplify');

    expect(Amplify.configure).toHaveBeenCalledWith({
      Auth: {
        Cognito: {
          userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
          userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        },
      },
    });
  });
});
