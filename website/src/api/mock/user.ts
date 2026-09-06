import type { User } from '../types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Morgan Reyes',
  username: 'morgan',
  email: 'morgan@filacrypt.com',
  emailVerified: true,
  preferences: {
    weightUnit: 'g',
    temperatureUnit: 'C',
    lengthUnit: 'm',
    currency: 'USD',
    theme: 'dark',
    defaultEntryMode: 'nfc',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
};
