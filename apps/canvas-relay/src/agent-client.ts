import { callSchema, sessionPath } from './protocol.ts';
import type { RelayConnection, RelayOperation } from './protocol.ts';
export type { RelayConnection, RelayOperation } from './protocol.ts';

export function validateServiceUrl(value: string): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/.test(url.pathname) ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  ) {
    throw new Error('Use an HTTPS relay origin (loopback HTTP is allowed for local development).');
  }
  return url.origin + url.pathname.replace(/\/$/, '');
}
export class RelayRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(options: { status: number; code: string }) {
    super(options.code);
    this.name = 'RelayRequestError';
    this.status = options.status;
    this.code = options.code;
  }
}

export async function relayRequest(
  connection: RelayConnection,
  route: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const origin = validateServiceUrl(connection.serviceUrl);
  const response = await fetch(origin + sessionPath(connection) + route, {
    ...init,
    credentials: 'omit',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
      Authorization: `Bearer ${connection.token}`,
    },
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new RelayRequestError({
      status: response.status,
      code:
        typeof data.code === 'string' ? data.code : `Relay request failed (${response.status}).`,
    });
  }
  return data;
}

export async function callRelay(
  connection: RelayConnection,
  input: {
    id: string;
    epoch: string;
    tool: string;
    input: Record<string, unknown>;
  },
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<RelayOperation> {
  callSchema.parse(input);
  const timeout = options.timeoutMs ?? 65000;
  // Observe one admitted operation; never replay POST after a transport error.
  let result = (await relayRequest(connection, '/calls', {
    method: 'POST',
    body: JSON.stringify(input),
    signal: options.signal,
  })) as RelayOperation;
  const deadline = Date.now() + timeout;
  while (result.status === 'dispatched' && Date.now() < deadline && !options.signal?.aborted) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150);
    });
    result = (await relayRequest(connection, `/calls/${input.id}`, {
      signal: options.signal,
    })) as RelayOperation;
  }
  return result;
}
