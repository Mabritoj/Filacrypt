import { Logger } from './index.js';

test('writes structured JSON with the correlation id and level', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const logger = new Logger('test-correlation-id');

  logger.info('hello', { foo: 'bar' });

  expect(logSpy).toHaveBeenCalledTimes(1);
  const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
  expect(logged).toMatchObject({
    level: 'INFO',
    message: 'hello',
    correlationId: 'test-correlation-id',
    foo: 'bar',
  });
  expect(typeof logged.timestamp).toBe('string');

  logSpy.mockRestore();
});

test('warning() and error() use the right level', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const logger = new Logger('cid');

  logger.warning('careful');
  logger.error('broken');

  const levels = logSpy.mock.calls.map((call) => JSON.parse(call[0] as string).level);
  expect(levels).toEqual(['WARN', 'ERROR']);

  logSpy.mockRestore();
});
