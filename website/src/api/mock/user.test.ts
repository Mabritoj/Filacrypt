import { describe, expect, it } from 'vitest';
import { mockUser } from './user';

describe('mockUser', () => {
  it('matches the Account Settings mockup profile and preferences', () => {
    expect(mockUser.name).toBe('Morgan Reyes');
    expect(mockUser.username).toBe('morgan');
    expect(mockUser.email).toBe('morgan@filacrypt.com');
    expect(mockUser.emailVerified).toBe(true);
    expect(mockUser.preferences).toEqual({
      weightUnit: 'g',
      temperatureUnit: 'C',
      lengthUnit: 'm',
      currency: 'USD',
      theme: 'dark',
      defaultEntryMode: 'nfc',
    });
  });
});
