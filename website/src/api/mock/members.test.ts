import { expect, test } from 'vitest';
import { mockMembers } from './members';

test('has at least three members', () => {
  expect(mockMembers.length).toBeGreaterThanOrEqual(3);
});

test('has exactly one owner', () => {
  expect(mockMembers.filter((m) => m.role === 'owner')).toHaveLength(1);
});

test('every member row-level role has a plausible filamentPermissions shape', () => {
  for (const member of mockMembers) {
    if (member.role === 'member') {
      expect(member.filamentPermissions).toBeDefined();
    }
  }
});
