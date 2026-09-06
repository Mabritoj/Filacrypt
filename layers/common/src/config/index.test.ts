import { requireEnv, config } from './index.js';

test('requireEnv returns the value when the env var is set', () => {
  process.env.TEST_VAR = 'hello';
  expect(requireEnv('TEST_VAR')).toBe('hello');
  delete process.env.TEST_VAR;
});

test('requireEnv throws a descriptive error when the env var is missing', () => {
  delete process.env.MISSING_VAR;
  expect(() => requireEnv('MISSING_VAR')).toThrow(
    'Missing required environment variable: MISSING_VAR'
  );
});

test('config.tableName reads from the TABLE_NAME env var', () => {
  expect(config.tableName).toBe('test-table');
});
