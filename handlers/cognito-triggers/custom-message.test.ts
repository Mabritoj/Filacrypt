import { CustomMessageTriggerEvent } from 'aws-lambda';
import { Logger } from 'logger';
import { handler } from './custom-message.js';

const mockLogger = new Logger('test-correlation-id');

function mockEvent(codeParameter: string): CustomMessageTriggerEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    userName: 'test-user',
    callerContext: { awsSdkVersion: 'test', clientId: 'test-client' },
    triggerSource: 'CustomMessage_Authentication',
    request: {
      userAttributes: {},
      codeParameter,
      linkParameter: '',
      usernameParameter: null,
      clientMetadata: {},
    },
    response: { smsMessage: null, emailMessage: null, emailSubject: null },
  } as CustomMessageTriggerEvent;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('sets a branded subject line', async () => {
  const result = await handler(mockEvent('{####}'), mockLogger);

  expect(result.response.emailSubject).toBe('Your Filacrypt sign-in code');
});

test('embeds the code placeholder, not a raw code', async () => {
  const result = await handler(mockEvent('{####}'), mockLogger);

  expect(result.response.emailMessage).toContain('{####}');
});

test('includes the brand colors in the HTML', async () => {
  const result = await handler(mockEvent('{####}'), mockLogger);

  expect(result.response.emailMessage).toContain('#b06a37');
  expect(result.response.emailMessage).toContain('#efe7dd');
});
