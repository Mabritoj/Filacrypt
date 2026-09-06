export class Logger {
  constructor(private correlationId: string) {}

  private write(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({
      level,
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.write('INFO', message, meta);
  }

  warning(message: string, meta?: Record<string, unknown>) {
    this.write('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.write('ERROR', message, meta);
  }
}
