import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectRelayEditor } from '../src/client.ts';
import { relayVersion } from '../src/protocol.ts';

const connection = {
  serviceUrl: 'https://relay.example',
  tenant: 'alpha',
  session: '4940cd02-e9fd-4000-8000-432e84c088a5',
  token: 'private',
};
const firstEpoch = '07d8d7f0-0a72-4a1a-8b0d-796003cdf7e3';
const nextEpoch = '08d8d7f0-0a72-4a1a-8b0d-796003cdf7e3';
const callId = 'ba0ac528-e1ba-4d1f-8a7c-66ab0a2c1c5a';
class Socket extends EventTarget {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  send = vi.fn();
  constructor(readonly url: string) {
    super();
    Socket.instances.push(this);
  }
  receive(value: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', {
        data: typeof value === 'string' ? value : JSON.stringify(value),
      }),
    );
  }
  ready(epoch = firstEpoch) {
    this.readyState = 1;
    this.receive({ type: 'connected', protocolVersion: relayVersion, epoch });
    this.receive({ type: 'ready', epoch });
  }
  drop(code = 1006) {
    if (this.readyState === 3) {
      return;
    }
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event('close'), { code }));
  }
  close() {
    this.drop(1000);
  }
}
const fetch = vi.fn<typeof globalThis.fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  fetch.mockImplementation(async () => Response.json({ ticket: crypto.randomUUID() }));
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('WebSocket', Socket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetch.mockReset();
});
async function open(tools: Parameters<typeof connectRelayEditor>[1] = []) {
  const lifetime = new AbortController();
  const pending = connectRelayEditor(connection, tools, { signal: lifetime.signal });
  await vi.advanceTimersByTimeAsync(0);
  Socket.instances[0]!.ready();
  const client = await pending;
  return { client, lifetime };
}
it('reconnects with a new ticket and epoch without replaying a dispatched edit', async () => {
  let complete!: (result: Record<string, unknown>) => void;
  const execute = vi.fn<Parameters<typeof connectRelayEditor>[1][number]['execute']>(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const { client, lifetime } = await open([
    { name: 'ghost_canvas_edit', description: 'Edit', inputSchema: { type: 'object' }, execute },
  ]);
  const first = Socket.instances[0]!;
  first.receive({
    type: 'call',
    id: callId,
    epoch: firstEpoch,
    tool: 'ghost_canvas_edit',
    input: {},
  });
  expect(execute).toHaveBeenCalledOnce();
  const dispatchedSignal = execute.mock.calls[0]![1]!.signal;
  first.drop();
  await vi.advanceTimersByTimeAsync(501);
  const next = Socket.instances[1]!;
  expect(next.url).not.toBe(first.url);
  expect(dispatchedSignal!.aborted).toBe(true);
  next.ready(nextEpoch);
  next.receive({
    type: 'call',
    id: callId,
    epoch: nextEpoch,
    tool: 'ghost_canvas_edit',
    input: {},
  });
  expect(execute).toHaveBeenCalledOnce();
  complete({ status: 'ok' });
  await vi.advanceTimersByTimeAsync(0);
  expect(next.send.mock.calls).toHaveLength(1); // Catalog only; no old result forwarded.
  client.close();
  await vi.advanceTimersByTimeAsync(60000);
  expect(Socket.instances).toHaveLength(2);
  lifetime.abort();
});
it('recovers from initial ticket network failure without retrying any edit', async () => {
  fetch.mockRejectedValueOnce(new Error('Network offline'));
  const lifetime = new AbortController();
  const pending = connectRelayEditor(connection, [], { signal: lifetime.signal });
  await vi.advanceTimersByTimeAsync(501);
  expect(fetch).toHaveBeenCalledTimes(2);
  Socket.instances[0]!.ready();
  await pending;
  lifetime.abort();
});
it('detects a silent socket drop using a heartbeat and reconnects', async () => {
  const { lifetime } = await open();
  await vi.advanceTimersByTimeAsync(30000);
  expect(Socket.instances[0]!.send).toHaveBeenCalledWith('ping');
  await vi.advanceTimersByTimeAsync(10501);
  expect(Socket.instances[0]!.readyState).toBe(3);
  expect(Socket.instances).toHaveLength(2);
  Socket.instances[1]!.ready(nextEpoch);
  lifetime.abort();
});
it('keeps a healthy idle connection when the Durable Object answers pong', async () => {
  const { lifetime } = await open();
  await vi.advanceTimersByTimeAsync(30000);
  Socket.instances[0]!.receive('pong');
  await vi.advanceTimersByTimeAsync(10001);
  expect(Socket.instances).toHaveLength(1);
  expect(Socket.instances[0]!.readyState).toBe(1);
  lifetime.abort();
});
it('stops reconnecting after the relay revokes or expires the session', async () => {
  const { lifetime } = await open();
  fetch.mockResolvedValueOnce(Response.json({ code: 'session_expired' }, { status: 410 }));
  Socket.instances[0]!.drop();
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Socket.instances).toHaveLength(1);
  lifetime.abort();
});
it('closing the tab cancels backoff and prevents another socket', async () => {
  const { lifetime } = await open();
  Socket.instances[0]!.drop();
  lifetime.abort();
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetch).toHaveBeenCalledOnce();
  expect(Socket.instances).toHaveLength(1);
});
