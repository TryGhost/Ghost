import { callSchema, identifier, relayVersion, sessionPath } from './protocol.ts';
import type { RelayConnection } from './protocol.ts';
export type { RelayConnection } from './protocol.ts';

export type RelayTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<Record<string, unknown>>;
};
export { callRelay, relayRequest, validateServiceUrl } from './agent-client.ts';
import { relayRequest, validateServiceUrl, RelayRequestError } from './agent-client.ts';

/** The authenticated editor keeps its authorized session across transport drops.
 * Only ticket acquisition/handshakes retry; dispatched edits are never replayed. */
export async function connectRelayEditor(
  connection: RelayConnection,
  tools: RelayTool[],
  options: {
    signal: AbortSignal;
    onStatus?: (status: 'connected' | 'disconnected' | 'failed') => void;
  },
): Promise<{ close: () => void }> {
  validateServiceUrl(connection.serviceUrl);
  const lifetime = new AbortController();
  const dispatched = new Set<string>();
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const close = () => {
    lifetime.abort();
    rejectReady(new Error('Editor closed before connection.'));
    options.signal.removeEventListener('abort', close);
  };
  if (options.signal.aborted) {
    close();
  } else {
    options.signal.addEventListener('abort', close, { once: true });
  }
  void (async () => {
    let failures = 0;
    while (!lifetime.signal.aborted) {
      try {
        await editorSocket(connection, tools, dispatched, lifetime.signal, () => {
          failures = 0;
          resolveReady();
          options.onStatus?.('connected');
        });
      } catch (cause) {
        if (lifetime.signal.aborted) {
          break;
        }
        if (
          cause instanceof RelayProtocolError ||
          (cause instanceof RelayRequestError && [400, 401, 403, 404, 410].includes(cause.status))
        ) {
          options.onStatus?.('failed');
          rejectReady(cause);
          close();
          break;
        }
      }
      if (!lifetime.signal.aborted) {
        options.onStatus?.('disconnected');
        const ceiling = Math.min(10000, 500 * 2 ** Math.min(failures, 5));
        failures += 1;
        await reconnectDelay(ceiling * (0.5 + Math.random() * 0.5), lifetime.signal);
      }
    }
  })();
  await ready;
  return { close };
}

class RelayProtocolError extends Error {
  constructor(options: { message: string }) {
    super(options.message);
  }
}

function reconnectDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener('abort', done, { once: true });
    if (signal.aborted) {
      done();
    }
  });
}

async function editorSocket(
  connection: RelayConnection,
  tools: RelayTool[],
  dispatched: Set<string>,
  signal: AbortSignal,
  onReady: () => void,
): Promise<void> {
  const lifetime = new AbortController();
  const registry = new Map(tools.map((tool) => [tool.name, tool]));
  let socket: WebSocket | undefined;
  let finish: (cause?: Error) => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let pongDeadline: ReturnType<typeof setTimeout> | undefined;
  const abort = () => {
    lifetime.abort();
    finish();
  };
  signal.addEventListener('abort', abort, { once: true });
  const handshakeDeadline = setTimeout(() => {
    lifetime.abort();
    finish(new Error('Editor connection timed out.'));
  }, 10000);
  try {
    if (signal.aborted) {
      return;
    }
    const ticket = await relayRequest(connection, '/editor-ticket', {
      method: 'POST',
      signal: lifetime.signal,
    });
    if (signal.aborted) {
      return;
    }
    const socketUrl = new URL(
      validateServiceUrl(connection.serviceUrl) + sessionPath(connection) + '/editor',
    );
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl.searchParams.set('ticket', identifier.parse(ticket.ticket));
    socket = new WebSocket(socketUrl.href);
    const current = socket;
    let epoch: string | null = null;
    const send = (message: unknown) => {
      if (!lifetime.signal.aborted && current.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify(message));
      }
    };
    await new Promise<void>((resolve, reject) => {
      let finished = false;
      finish = (cause) => {
        if (finished) {
          return;
        }
        finished = true;
        lifetime.abort();
        if (cause) {
          reject(cause);
        } else {
          resolve();
        }
      };
      current.addEventListener('close', (event) => {
        finish(
          [1008, 1009].includes(event.code)
            ? new RelayProtocolError({ message: 'The relay closed this session.' })
            : new Error('Editor connection closed.'),
        );
      });
      current.addEventListener('error', () => finish(new Error('Editor connection failed.')));
      current.addEventListener('message', (event) => {
        void (async () => {
          if (lifetime.signal.aborted) {
            return;
          }
          if (event.data === 'pong') {
            clearTimeout(pongDeadline);
            pongDeadline = undefined;
            return;
          }
          if (typeof event.data !== 'string') {
            throw new RelayProtocolError({ message: 'Invalid relay response.' });
          }
          const message = JSON.parse(event.data) as Record<string, unknown>;
          if (message.type === 'connected' && message.protocolVersion === relayVersion) {
            epoch = identifier.parse(message.epoch);
            send({
              type: 'hello',
              tools: tools.map(({ name, description, inputSchema }) => ({
                name,
                description,
                inputSchema,
              })),
            });
            return;
          }
          if (message.type === 'ready' && message.epoch === epoch) {
            clearTimeout(handshakeDeadline);
            if (!heartbeat) {
              heartbeat = setInterval(() => {
                if (current.readyState !== WebSocket.OPEN) {
                  finish(new Error('Editor connection lost.'));
                  return;
                }
                // Workerd answers without waking the Durable Object.
                current.send('ping');
                pongDeadline = setTimeout(
                  () => finish(new Error('Editor heartbeat timed out.')),
                  10000,
                );
              }, 30000);
              onReady();
            }
            return;
          }
          if (message.type !== 'call') {
            return;
          }
          const payload = { ...message };
          delete payload.type;
          const call = callSchema.parse(payload);
          if (call.epoch !== epoch || dispatched.has(call.id)) {
            return;
          }
          dispatched.add(call.id);
          const tool = registry.get(call.tool);
          let result: Record<string, unknown>;
          try {
            result = tool
              ? await tool.execute(call.input, { signal: lifetime.signal })
              : { status: 'error', code: 'unavailable' };
          } catch {
            result = {
              status: 'error',
              code: 'execution_uncertain',
              message: 'Inspect editor state before deciding how to recover.',
            };
          }
          send({ type: 'result', id: call.id, epoch, result });
        })().catch(() => finish(new RelayProtocolError({ message: 'Invalid relay response.' })));
      });
      if (signal.aborted) {
        finish();
      }
    });
  } finally {
    clearTimeout(handshakeDeadline);
    clearInterval(heartbeat);
    clearTimeout(pongDeadline);
    lifetime.abort();
    signal.removeEventListener('abort', abort);
    socket?.close(1000, 'Editor connection ended');
  }
}
