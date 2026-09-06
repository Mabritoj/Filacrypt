import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/**
 * Was copy-pasted verbatim into 8 handler files -- see the review that
 * flagged it for the exact list. Any change to the error envelope now only
 * has to happen here.
 */
export function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }) };
}
