import { getPathParam, getUserId } from './index.js';

describe('getPathParam', () => {
  test('returns the named path parameter when present', () => {
    const event = { pathParameters: { workspaceId: 'ws-1' } };
    expect(getPathParam(event, 'workspaceId')).toBe('ws-1');
  });

  test('throws when the path parameter is missing', () => {
    const event = { pathParameters: {} };
    expect(() => getPathParam(event, 'workspaceId')).toThrow(/workspaceId/);
  });

  test('throws when pathParameters itself is undefined', () => {
    const event = {};
    expect(() => getPathParam(event, 'workspaceId')).toThrow(/workspaceId/);
  });
});

describe('getUserId', () => {
  function jwtEvent(sub: unknown) {
    return {
      requestContext: { authorizer: { jwt: { claims: { sub } } } },
    } as unknown as Parameters<typeof getUserId>[0];
  }

  test('returns the JWT sub claim when present', () => {
    expect(getUserId(jwtEvent('user-123'))).toBe('user-123');
  });

  test('throws when the sub claim is missing', () => {
    expect(() => getUserId(jwtEvent(undefined))).toThrow(/sub/i);
  });
});
