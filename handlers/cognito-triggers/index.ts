import { randomUUID } from 'crypto';
import { CustomMessageTriggerEvent } from 'aws-lambda';
import { Logger } from 'logger';

export const handler = async (
  event: CustomMessageTriggerEvent
): Promise<CustomMessageTriggerEvent> => {
  const correlationId = randomUUID();
  const logger = new Logger(correlationId);
  logger.info('Cognito trigger received', { triggerSource: event.triggerSource });

  if (event.triggerSource === 'CustomMessage_Authentication') {
    return (await import('./custom-message.js')).handler(event, logger);
  }

  logger.info('No custom handling for trigger source, using Cognito default', {
    triggerSource: event.triggerSource,
  });
  return event;
};
