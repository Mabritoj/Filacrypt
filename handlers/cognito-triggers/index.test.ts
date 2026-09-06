import { CustomMessageTriggerEvent } from 'aws-lambda';

jest.mock('./custom-message.js', () => ({
  handler: jest.fn().mockImplementation((event) => ({
    ...event,
    response: { ...event.response, emailSubject: 'mocked', emailMessage: 'mocked' },
  })),
}));

import { handler } from './index.js';
import { handler as customMessageHandler } from './custom-message.js';

function mockEvent(triggerSource: string): CustomMessageTriggerEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    userName: 'test-user',
    callerContext: { awsSdkVersion: 'test', clientId: 'test-client' },
    triggerSource,
    request: {
      userAttributes: {},
      codeParameter: '{####}',
      linkParameter: '',
      usernameParameter: null,
      clientMetadata: {},
    },
    response: { smsMessage: null, emailMessage: null, emailSubject: null },
  } as unknown as CustomMessageTriggerEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('routes CustomMessage_Authentication to custom-message.ts', async () => {
  const result = await handler(mockEvent('CustomMessage_Authentication'));

  expect(customMessageHandler).toHaveBeenCalledTimes(1);
  expect(result.response.emailSubject).toBe('mocked');
});

test('passes through other trigger sources unmodified', async () => {
  const event = mockEvent('CustomMessage_AdminCreateUser');

  const result = await handler(event);

  expect(customMessageHandler).not.toHaveBeenCalled();
  expect(result.response.emailSubject).toBeNull();
  expect(result.response.emailMessage).toBeNull();
});
