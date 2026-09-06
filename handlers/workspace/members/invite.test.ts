jest.mock('../members-lookup.js', () => ({
  findUserByEmail: jest.fn(),
  addMember: jest.fn(),
}));

import { Logger } from 'logger';
import { handler } from './invite.js';
import { findUserByEmail, addMember } from '../members-lookup.js';
import type { WorkspaceEvent } from '../index.js';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockAddMember = addMember as jest.Mock;
const logger = new Logger('test');

function mockEvent(body: unknown): WorkspaceEvent {
  return {
    pathParameters: { workspaceId: 'ws-1' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'owner' } } },
    body: JSON.stringify(body),
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('adds the member and returns 201 with the joined member record, built directly from the write -- no listMembers re-query', async () => {
  mockFindUserByEmail.mockResolvedValue({ id: 'user-2', name: 'Grace', email: 'grace@example.com' });
  mockAddMember.mockResolvedValue({
    role: 'member',
    filamentPermissions: { create: false, read: false, update: false, delete: false },
    joinedAt: '2026-08-23T00:00:00.000Z',
  });

  const result = await handler(mockEvent({ email: 'grace@example.com' }), logger);

  expect(result.statusCode).toBe(201);
  expect(JSON.parse(result.body!)).toEqual({
    member: {
      userId: 'user-2',
      name: 'Grace',
      email: 'grace@example.com',
      role: 'member',
      filamentPermissions: { create: false, read: false, update: false, delete: false },
      joinedAt: '2026-08-23T00:00:00.000Z',
    },
  });
  expect(mockAddMember).toHaveBeenCalledWith('ws-1', 'user-2');
});

test('returns 400 when email is missing', async () => {
  const result = await handler(mockEvent({}), logger);

  expect(result.statusCode).toBe(400);
  expect(mockFindUserByEmail).not.toHaveBeenCalled();
});

test('returns 404 when no Filacrypt user has that email', async () => {
  mockFindUserByEmail.mockResolvedValue(null);

  const result = await handler(mockEvent({ email: 'nobody@example.com' }), logger);

  expect(result.statusCode).toBe(404);
  expect(mockAddMember).not.toHaveBeenCalled();
});

test('returns 409 when the user is already a member', async () => {
  mockFindUserByEmail.mockResolvedValue({ id: 'user-2', name: 'Grace' });
  mockAddMember.mockRejectedValue(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));

  const result = await handler(mockEvent({ email: 'grace@example.com' }), logger);

  expect(result.statusCode).toBe(409);
});
