import path from 'node:path';
import errors from '@tryghost/errors';
import { Agent, request as send } from 'undici';
import { z } from 'zod';
import {
  UpgradeAdapterError,
  UpgradeBase,
  upgradeDiagnosticsSchema,
  upgradeErrorCodeSchema,
  upgradeJobIdSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
  type CreateUpgradeRequest,
  type UpgradeDiagnostic,
  type UpgradeJob,
  type UpgradeJobResult,
  type UpgradeStatus,
} from '@tryghost/adapter-base-upgrade';

// Implements ghost-docker's docs/upgrade-supervisor.md, protocol 1.
export const PROTOCOL = 1;

// Protocol bodies are a few KiB; anything far larger is not a protocol answer.
const MAX_RESPONSE_BYTES = 1024 * 1024;

// Protocol answers are immediate; anything slower is a stuck or missing host.
const DEFAULT_TIMEOUT_MS = 5000;

const configSchema = z.object({
  /** The Unix socket the host serves the API on, such as ghost-docker's supervisor. */
  socketPath: z
    .string({ error: 'HttpUpgradeAdapter requires socketPath.' })
    .refine(path.isAbsolute, { error: 'HttpUpgradeAdapter socketPath must be absolute.' }),
});

export const handshakeSchema = z.object({ protocol: z.literal(PROTOCOL) });

export const errorBodySchema = z.object({
  error: z.object({ code: z.string(), diagnostics: upgradeDiagnosticsSchema.optional() }),
});

interface Response {
  status: number;
  body: unknown;
}

/** The host could not be reached; an error the API reports as unavailable, not a bug. */
class Unreachable extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

const unreachableCodes = new Set([
  'ENOENT',
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CLOSED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_ABORTED',
]);

function errorCode(value: unknown): string | undefined {
  return typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string'
    ? value.code
    : undefined;
}

function isUnreachable(error: unknown): boolean {
  // AbortSignal.timeout rejects with a DOMException named TimeoutError.
  if (error instanceof Error && error.name === 'TimeoutError') {
    return true;
  }
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    unreachableCodes.has(errorCode(error) ?? '') || unreachableCodes.has(errorCode(cause) ?? '')
  );
}

function diagnostic(code: string, message: string): UpgradeDiagnostic {
  return { source: 'ghost', code, severity: 'error', message };
}

/** Talks to a host's upgrade API (HTTP protocol 1) over a Unix socket. */
export default class HttpUpgradeAdapter extends UpgradeBase {
  readonly #timeoutMs: number;
  readonly #dispatcher: Agent;

  /** Called by the adapter manager at boot, so a misconfigured host fails early. */
  static validate(config: unknown): void {
    const result = configSchema.safeParse(config);
    if (!result.success) {
      throw new errors.IncorrectUsageError({
        message: [...new Set(result.error.issues.map((issue) => issue.message))].join('; '),
      });
    }
  }

  constructor(config: unknown) {
    super();
    HttpUpgradeAdapter.validate(config);
    const { socketPath } = configSchema.parse(config);
    // A test-only seam, read outside the schema so it is not configuration.
    this.#timeoutMs = (config as { timeoutMs?: number }).timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // Creating the agent opens no connection, so Ghost boots whether or not the host is up.
    this.#dispatcher = new Agent({
      maxResponseSize: MAX_RESPONSE_BYTES,
      connect: { socketPath, timeout: this.#timeoutMs },
    });
  }

  async getStatus(): Promise<UpgradeStatus> {
    let handshake: Response;
    let status: Response;
    try {
      handshake = await this.#request('GET', '/v1');
      status = handshake.status === 200 ? await this.#request('GET', '/v1/status') : handshake;
    } catch (error) {
      if (!(error instanceof Unreachable)) {
        throw error;
      }
      handshake = status = { status: 503, body: undefined };
    }
    if (handshake.status >= 500 || status.status >= 500) {
      return {
        supported: true,
        availability: 'unavailable',
        diagnostics: [diagnostic('host-unreachable', 'Ghost could not reach the update service.')],
      };
    }

    const protocol = handshakeSchema.safeParse(handshake.body);
    const parsed = upgradeStatusSchema.safeParse(status.body);
    if (!protocol.success || status.status !== 200 || !parsed.success) {
      return {
        supported: true,
        availability: 'incompatible',
        diagnostics: [
          diagnostic(
            'protocol-mismatch',
            'The update service uses a protocol this version of Ghost does not support.',
          ),
        ],
      };
    }
    return parsed.data;
  }

  async createRequest(request: CreateUpgradeRequest): Promise<UpgradeJob> {
    const response = await this.#call('POST', '/v1/requests', request);
    if (response.status === 200 || response.status === 202) {
      return upgradeJobSchema.parse(response.body);
    }
    const rejection = errorBodySchema.safeParse(response.body);
    const code = upgradeErrorCodeSchema.safeParse(rejection.data?.error.code);
    if (code.success) {
      throw new UpgradeAdapterError({
        code: code.data,
        diagnostics: rejection.data?.error.diagnostics,
      });
    }
    // A host or proxy can fail without a protocol error body, e.g. while restarting.
    if (response.status >= 500) {
      throw new UpgradeAdapterError({ code: 'unavailable' });
    }
    throw new errors.IncorrectUsageError({
      message: `The update service answered ${response.status} to a request.`,
    });
  }

  async getJob(id: string): Promise<UpgradeJobResult> {
    if (!upgradeJobIdSchema.safeParse(id).success) {
      return { id, state: 'unknown' };
    }
    const response = await this.#call('GET', `/v1/jobs/${id}`);
    if (response.status >= 500) {
      throw new UpgradeAdapterError({ code: 'unavailable' });
    }
    if (response.status !== 200) {
      throw new errors.IncorrectUsageError({
        message: `The update service answered ${response.status} to a job lookup.`,
      });
    }
    return upgradeJobResultSchema.parse(response.body);
  }

  /** Like #request, but an unreachable host is the adapter's `unavailable` rejection. */
  async #call(method: string, route: string, body?: object): Promise<Response> {
    try {
      return await this.#request(method, route, body);
    } catch (error) {
      if (error instanceof Unreachable) {
        throw new UpgradeAdapterError({ code: 'unavailable' });
      }
      throw error;
    }
  }

  async #request(method: string, route: string, body?: object): Promise<Response> {
    // The host name is unused; the agent connects to socketPath.
    const target = new URL(route, 'http://localhost');

    try {
      const response = await send(target, {
        method,
        dispatcher: this.#dispatcher,
        // A kept-alive connection is dead after the host restarts; connect per call.
        reset: true,
        // A deadline for the whole exchange, not just between chunks.
        signal: AbortSignal.timeout(this.#timeoutMs),
        headers: {
          accept: 'application/json',
          ...(body && { 'content-type': 'application/json' }),
        },
        body: body && JSON.stringify(body),
      });
      // Read errors reach isUnreachable below; only a malformed body becomes undefined.
      const text = await response.body.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : undefined;
      } catch {
        parsed = undefined;
      }
      return { status: response.statusCode, body: parsed };
    } catch (error) {
      if (isUnreachable(error)) {
        throw new Unreachable({ message: error instanceof Error ? error.message : String(error) });
      }
      throw error;
    }
  }
}
