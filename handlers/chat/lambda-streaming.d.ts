import type { Writable } from 'stream';

declare global {
  namespace awslambda {
    interface HttpResponseStream {
      from(
        stream: Writable,
        metadata: {
          statusCode: number;
          headers?: Record<string, string>;
        },
      ): Writable;
    }

    const HttpResponseStream: HttpResponseStream;

    function streamifyResponse(
      handler: (event: unknown, responseStream: Writable) => Promise<void>,
    ): unknown;
  }
}

export {};
