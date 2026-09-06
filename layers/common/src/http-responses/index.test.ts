import { validationError } from './index.js';

test('validationError returns a 400 with a VALIDATION_ERROR envelope carrying the message', () => {
  const result = validationError('brand must be a string');

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'brand must be a string' },
  });
});
