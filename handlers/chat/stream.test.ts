import { NdjsonWriter } from './stream.js';

function makeSink() {
  const chunks: string[] = [];
  return { chunks, write: (c: string) => chunks.push(c) };
}

test('each event is a single JSON object on its own line', () => {
  const sink = makeSink();
  const writer = new NdjsonWriter(sink);

  writer.text('Hello');
  writer.spools(['a', 'b']);
  writer.done();

  expect(sink.chunks).toEqual([
    '{"type":"text","delta":"Hello"}\n',
    '{"type":"spools","ids":["a","b"]}\n',
    '{"type":"done"}\n',
  ]);
});

test('newlines inside text are escaped so they cannot split a line', () => {
  const sink = makeSink();
  new NdjsonWriter(sink).text('line one\nline two');

  expect(sink.chunks[0]).toBe('{"type":"text","delta":"line one\\nline two"}\n');
  expect(sink.chunks[0].split('\n').filter(Boolean)).toHaveLength(1);
});

test('error events carry a message', () => {
  const sink = makeSink();
  new NdjsonWriter(sink).error('boom');

  expect(JSON.parse(sink.chunks[0])).toEqual({ type: 'error', message: 'boom' });
});

test('empty spool lists are not written', () => {
  const sink = makeSink();
  new NdjsonWriter(sink).spools([]);

  expect(sink.chunks).toEqual([]);
});
