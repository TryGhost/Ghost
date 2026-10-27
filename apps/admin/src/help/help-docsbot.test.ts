import { describe, expect, it } from 'vitest';
import { parseSseBlock, readSseEvents, toDocsBotEvent } from './help-docsbot';

function streamOf(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect<T>(events: AsyncIterable<T>) {
  const all: T[] = [];
  for await (const event of events) {
    all.push(event);
  }
  return all;
}

describe('parseSseBlock', () => {
  it('reads the event name and data', () => {
    expect(parseSseBlock('event: stream\ndata: Hello')).toEqual({ event: 'stream', data: 'Hello' });
  });

  it('keeps a leading space beyond the first, as tokens start with one', () => {
    expect(parseSseBlock('event: stream\ndata:  can')?.data).toBe(' can');
  });

  it('joins several data lines with a newline, which is how a line break arrives', () => {
    expect(parseSseBlock('event: stream\ndata: \ndata: ')?.data).toBe('\n');
  });

  it('ignores comments and blocks without data', () => {
    expect(parseSseBlock(': keep-alive')).toBeNull();
    expect(parseSseBlock('event: stream')).toBeNull();
  });
});

describe('readSseEvents', () => {
  it('reassembles events split across chunks', async () => {
    const events = await collect(
      readSseEvents(
        streamOf(['event: stream\nda', 'ta: You\n\nevent: str', 'eam\ndata:  can\n\n']),
      ),
    );
    expect(events).toEqual([
      { event: 'stream', data: 'You' },
      { event: 'stream', data: ' can' },
    ]);
  });

  it('yields a final event the body ends without a blank line after', async () => {
    const events = await collect(readSseEvents(streamOf(['event: answer\ndata: {"answer":"Hi"}'])));
    expect(events).toEqual([{ event: 'answer', data: '{"answer":"Hi"}' }]);
  });
});

describe('toDocsBotEvent', () => {
  it('turns a search tool call into the queries it ran', () => {
    const params = JSON.stringify({ query: ['connect Stripe', 'Stripe setup'] });
    const data = JSON.stringify({ name: 'search_documentation', params });
    expect(toDocsBotEvent({ event: 'tool_call', data })).toEqual({
      type: 'searching',
      queries: ['connect Stripe', 'Stripe setup'],
    });
  });

  it('keeps the answer, its usable sources and whether it could answer', () => {
    const data = JSON.stringify({
      answer: 'Go to **Settings**.',
      id: 'abc',
      couldAnswer: true,
      sources: [
        { title: 'Connecting Stripe', url: 'https://ghost.org/help/stripe/', used: true },
        { title: 'Odd', url: 'http://insecure.example', used: false },
        'not a source',
      ],
    });
    expect(toDocsBotEvent({ event: 'lookup_answer', data })).toEqual({
      type: 'answer',
      answer: 'Go to **Settings**.',
      id: 'abc',
      couldAnswer: true,
      sources: [
        { title: 'Connecting Stripe', url: 'https://ghost.org/help/stripe/', used: true },
        { title: 'Odd', url: null, used: false },
      ],
    });
  });

  it('skips reasoning and other events the panel does not show', () => {
    expect(toDocsBotEvent({ event: 'reasoning', data: '{"text":""}' })).toBeNull();
    expect(toDocsBotEvent({ event: 'tool_call', data: 'not json' })).toBeNull();
  });
});
