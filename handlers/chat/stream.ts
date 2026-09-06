export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'spools'; ids: string[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface StreamSink {
  write(chunk: string): void;
}

/**
 * Writes newline-delimited JSON. JSON.stringify escapes newlines inside string
 * values, so a delta containing a line break can never split one logical event
 * across two lines.
 */
export class NdjsonWriter {
  constructor(private readonly sink: StreamSink) {}

  private emit(event: ChatEvent): void {
    this.sink.write(`${JSON.stringify(event)}\n`);
  }

  text(delta: string): void {
    if (delta === '') return;
    this.emit({ type: 'text', delta });
  }

  spools(ids: string[]): void {
    if (ids.length === 0) return;
    this.emit({ type: 'spools', ids });
  }

  error(message: string): void {
    this.emit({ type: 'error', message });
  }

  done(): void {
    this.emit({ type: 'done' });
  }
}
