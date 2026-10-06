import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import {
  callSchema,
  catalogSchema,
  claimsSchema,
  identifier,
  relayVersion,
  replySchema,
} from './protocol.ts';
import type { RelayClaims, RelayOperation } from './protocol.ts';

export type RelayEnv = {
  SESSIONS: DurableObjectNamespace;
  TENANT_KEYS: string;
  SERVICE_ORIGIN: string;
};
const registrySchema = z.record(
  z.string(),
  z.object({
    secret: z.string().min(32),
    origins: z.array(z.string().url()).min(1),
  }),
);
const maximumBytes = 1024 * 1024;
const operationLimit = 128;
const operationLifetime = 90_000;
const encoder = new TextEncoder();
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
const failure = (code: string, status: number) => json({ status: 'error', code }, status);
async function body(request: Request, allowEmpty = false): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error('invalid_body');
  }
  const decoder = new TextDecoder();
  let size = 0;
  let value = '';
  for (;;) {
    const part = await reader.read();
    if (part.done) {
      break;
    }
    size += part.value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new Error('payload_too_large');
    }
    value += decoder.decode(part.value, { stream: true });
  }
  const content = value + decoder.decode();
  return JSON.parse(allowEmpty && !content ? '{}' : content);
}
async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request: Request, env: RelayEnv): Promise<Response> {
    const url = new URL(request.url);
    const prefix = new URL(env.SERVICE_ORIGIN).pathname.replace(/\/$/, '');
    if (prefix && !url.pathname.startsWith(prefix + '/')) {
      return failure('not_found', 404);
    }
    url.pathname = url.pathname.slice(prefix.length);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ service: 'ghost-canvas-relay', protocolVersion: relayVersion });
    }
    const match =
      /^\/v1\/tenants\/([a-z0-9][a-z0-9-]{0,63})\/sessions\/([0-9a-f-]{36})(\/.*)?$/.exec(
        url.pathname,
      );
    if (!match || !identifier.safeParse(match[2]).success) {
      return failure('not_found', 404);
    }
    const tenant = match[1]!;
    const session = match[2]!;
    const route = match[3] ?? '';
    let origins: string[];
    let secret: string;
    try {
      const registry = registrySchema.parse(JSON.parse(env.TENANT_KEYS));
      if (!Object.hasOwn(registry, tenant)) {
        return failure('unauthorized', 401);
      }
      const config = registry[tenant];
      if (!config) {
        return failure('unauthorized', 401);
      }
      ({ origins, secret } = config);
    } catch {
      return failure('service_unconfigured', 503);
    }
    const origin = request.headers.get('Origin');
    if (origin && !origins.includes(origin)) {
      console.warn('Canvas relay rejected an unconfigured origin', { origin });
      return failure('origin_rejected', 403);
    }
    const cors = (response: Response) => {
      if (origin && response.status !== 101) {
        response = new Response(response.body, response);
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Vary', 'Origin');
      }
      return response;
    };
    if (request.method === 'OPTIONS') {
      return cors(
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          },
        }),
      );
    }
    const headers = new Headers(request.headers);
    headers.delete('X-Canvas-Claims');
    headers.set('X-Canvas-Tenant', tenant);
    headers.set('X-Canvas-Session', session);
    let forwardedBody: BodyInit | ReadableStream | null = request.body;
    const publicPairing = route === '/pairing' && ['GET', 'POST'].includes(request.method);
    if (route !== '/editor' && !publicPairing) {
      try {
        const token = /^Bearer ([^ ]+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
        if (!token) {
          return cors(failure('unauthorized', 401));
        }
        const verified = await jwtVerify(token, encoder.encode(secret), {
          algorithms: ['HS256'],
          issuer: 'ghost-canvas-relay',
          audience: env.SERVICE_ORIGIN,
        });
        const claims = claimsSchema.parse(verified.payload);
        const now = Math.floor(Date.now() / 1000);
        if (
          claims.tenant !== tenant ||
          claims.session !== session ||
          claims.iat > now + 30 ||
          claims.exp <= claims.iat ||
          claims.exp - claims.iat > 3600
        ) {
          return cors(failure('unauthorized', 401));
        }
        if (claims.role === 'editor' && !origin) {
          return cors(failure('origin_required', 403));
        }
        headers.set('X-Canvas-Claims', JSON.stringify(claims));
        if (route === '/pairing/approve') {
          if (claims.role !== 'editor' || request.method !== 'POST') {
            return cors(failure('wrong_role', 403));
          }
          const input = z
            .object({ code: z.string().regex(/^[A-F0-9]{8}$/) })
            .strict()
            .parse(await body(request));
          const agentToken = await new SignJWT({ tenant, session, role: 'agent' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuer('ghost-canvas-relay')
            .setAudience(env.SERVICE_ORIGIN)
            .setSubject(claims.sub)
            .setIssuedAt(claims.iat)
            .setExpirationTime(claims.exp)
            .sign(encoder.encode(secret));
          forwardedBody = JSON.stringify({ ...input, agentToken });
        }
      } catch {
        return cors(failure('unauthorized', 401));
      }
    } else if (
      !publicPairing &&
      (request.method !== 'GET' ||
        !origin ||
        request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
    ) {
      return cors(failure('invalid_upgrade', 400));
    }
    // The namespace is a private binding. Only verified requests reach it;
    // incoming clients cannot choose an object ID or supply trusted claims.
    if (['/editor-ticket', '/revoke', '/disconnect'].includes(route) && request.body) {
      // These endpoints have no payload. Consume it before returning from the
      // nested fetch so Wrangler does not outlive the incoming request stream.
      try {
        await body(request, true);
      } catch {
        return cors(failure('invalid_arguments', 400));
      }
      forwardedBody = null;
    }
    const target = env.SESSIONS.getByName(JSON.stringify([tenant, session]));
    const innerUrl = new URL(request.url);
    innerUrl.pathname = route || '/status';
    const response = await target.fetch(
      new Request(innerUrl, { method: request.method, headers, body: forwardedBody }),
    );
    return cors(response);
  },
} satisfies ExportedHandler<RelayEnv>;

type Session = {
  tenant: string;
  session: string;
  subject: string;
  expiresAt: number;
  epoch?: string;
  catalog?: z.infer<typeof catalogSchema>;
  revoked?: boolean;
};
type Attachment = { epoch: string; expiresAt: number };
type CallRow = {
  id: string;
  epoch: string;
  digest: string;
  status: RelayOperation['status'];
  result: string | null;
  reason: string | null;
  deadline: number;
};
type Pairing = {
  tenant: string;
  session: string;
  origin: string;
  codeHash: string;
  pollHash: string;
  expiresAt: number;
  attempts: number;
  agentToken?: string;
};

export class CanvasSession {
  constructor(private readonly ctx: DurableObjectState) {
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, epoch TEXT NOT NULL, digest TEXT NOT NULL, status TEXT NOT NULL, result TEXT, reason TEXT, deadline INTEGER NOT NULL)',
    );
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, expires INTEGER NOT NULL, origin TEXT NOT NULL)',
    );
  }
  private async session(claims: RelayClaims): Promise<Session | Response> {
    if (claims.exp * 1000 <= Date.now()) {
      return failure('session_expired', 410);
    }
    let current = await this.ctx.storage.get<Session>('session');
    if (!current) {
      if (await this.ctx.storage.get('expired')) {
        return failure('session_expired', 410);
      }
      current = {
        tenant: claims.tenant,
        session: claims.session,
        subject: claims.sub,
        expiresAt: claims.exp * 1000,
      };
      await this.ctx.storage.put('session', current);
      await this.ctx.storage.setAlarm(current.expiresAt);
    }
    if (
      current.tenant !== claims.tenant ||
      current.session !== claims.session ||
      current.subject !== claims.sub
    ) {
      return failure('unauthorized', 401);
    }
    if (current.revoked || current.expiresAt <= Date.now()) {
      return failure('session_expired', 410);
    }
    return current;
  }
  private editor(): WebSocket | undefined {
    return this.ctx.getWebSockets('editor').find((socket) => socket.readyState === WebSocket.OPEN);
  }
  private operation(row: CallRow): RelayOperation {
    return {
      id: row.id,
      epoch: row.epoch,
      status: row.status,
      ...(row.result ? { result: JSON.parse(row.result) as Record<string, unknown> } : {}),
      ...(row.reason ? { reason: row.reason } : {}),
    };
  }
  private rows(query: string, ...values: (string | number)[]): CallRow[] {
    return this.ctx.storage.sql.exec<CallRow>(query, ...values).toArray();
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/pairing') {
      return this.pairing(request);
    }
    if (url.pathname === '/editor') {
      return this.connect(request);
    }
    const claims = claimsSchema.safeParse(
      JSON.parse(request.headers.get('X-Canvas-Claims') ?? 'null'),
    );
    if (!claims.success) {
      return failure('unauthorized', 401);
    }
    if (url.pathname === '/pairing/approve') {
      return this.approvePairing(request, claims.data);
    }
    const session = await this.session(claims.data);
    if (session instanceof Response) {
      return session;
    }
    if (url.pathname === '/editor-ticket' && request.method === 'POST') {
      if (claims.data.role !== 'editor') {
        return failure('wrong_role', 403);
      }
      const ticket = crypto.randomUUID();
      const hashed = await digest(ticket);
      this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ?', Date.now());
      const count = this.ctx.storage.sql
        .exec<{ count: number }>('SELECT COUNT(*) AS count FROM tickets')
        .one().count;
      if (count >= 4) {
        return failure('ticket_limit', 429);
      }
      this.ctx.storage.sql.exec(
        'INSERT INTO tickets VALUES (?, ?, ?)',
        hashed,
        Math.min(Date.now() + 30000, session.expiresAt),
        request.headers.get('Origin')!,
      );
      return json({ ticket });
    }
    if (['/revoke', '/disconnect'].includes(url.pathname) && request.method === 'POST') {
      if (claims.data.role !== (url.pathname === '/revoke' ? 'editor' : 'agent')) {
        return failure('wrong_role', 403);
      }
      await this.ctx.storage.put('session', { ...session, revoked: true });
      this.disconnect('session_revoked');
      return json({ status: 'revoked' });
    }
    if (claims.data.role !== 'agent') {
      return failure('wrong_role', 403);
    }
    if (url.pathname === '/status' && request.method === 'GET') {
      return json({
        protocolVersion: relayVersion,
        connected: !!this.editor(),
        ready: !!this.editor() && !!session.catalog,
        epoch: session.epoch ?? null,
        tools: session.catalog ?? [],
      });
    }
    const resultId = /^\/calls\/([0-9a-f-]{36})$/.exec(url.pathname)?.[1];
    if (resultId && request.method === 'GET') {
      const row = this.rows('SELECT * FROM calls WHERE id = ?', resultId)[0];
      if (!row) {
        return failure('operation_not_found', 404);
      }
      if (row.status === 'dispatched' && row.deadline <= Date.now()) {
        this.ctx.storage.sql.exec(
          'UPDATE calls SET status = ?, reason = ? WHERE id = ?',
          'unknown',
          'observation_expired',
          row.id,
        );
        row.status = 'unknown';
        row.reason = 'observation_expired';
      }
      return json(this.operation(row));
    }
    if (url.pathname === '/calls' && request.method === 'POST') {
      let input;
      try {
        input = callSchema.parse(await body(request));
      } catch (error) {
        return failure(
          error instanceof Error && error.message === 'payload_too_large'
            ? 'payload_too_large'
            : 'invalid_arguments',
          400,
        );
      }
      const fingerprint = await digest(
        JSON.stringify({ epoch: input.epoch, tool: input.tool, input: input.input }),
      );
      const current = await this.session(claims.data);
      if (current instanceof Response) {
        return current;
      }
      const existing = this.rows('SELECT * FROM calls WHERE id = ?', input.id)[0];
      if (existing) {
        return existing.digest === fingerprint
          ? json(this.operation(existing))
          : failure('operation_conflict', 409);
      }
      const editor = this.editor();
      if (!editor || !current.catalog) {
        return failure('editor_offline', 503);
      }
      if (
        current.epoch !== input.epoch ||
        (editor.deserializeAttachment() as Attachment).epoch !== input.epoch
      ) {
        return failure('stale_session', 409);
      }
      const count = this.ctx.storage.sql
        .exec<{ count: number }>('SELECT COUNT(*) AS count FROM calls')
        .one().count;
      if (count >= operationLimit) {
        return failure('session_operation_limit', 429);
      }
      // No await between the final identity check, durable admission and send.
      this.ctx.storage.sql.exec(
        'INSERT INTO calls VALUES (?, ?, ?, ?, NULL, NULL, ?)',
        input.id,
        input.epoch,
        fingerprint,
        'dispatched',
        Date.now() + operationLifetime,
      );
      try {
        editor.send(JSON.stringify({ type: 'call', ...input }));
      } catch {
        this.ctx.storage.sql.exec(
          'UPDATE calls SET status = ?, reason = ? WHERE id = ?',
          'unknown',
          'dispatch_uncertain',
          input.id,
        );
      }
      return json(this.operation(this.rows('SELECT * FROM calls WHERE id = ?', input.id)[0]!), 202);
    }
    return failure('not_found', 404);
  }
  private async pairing(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      let input;
      try {
        input = z
          .object({ siteUrl: z.string().url(), pollSecret: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict()
          .parse(await body(request));
      } catch {
        return failure('invalid_arguments', 400);
      }
      const site = new URL(input.siteUrl);
      if (
        site.username ||
        site.password ||
        site.search ||
        site.hash ||
        !['http:', 'https:'].includes(site.protocol) ||
        site.origin !== request.headers.get('Origin')
      ) {
        console.warn('Canvas pairing origin mismatch', {
          siteOrigin: site.origin,
          requestOrigin: request.headers.get('Origin'),
        });
        return failure('origin_rejected', 403);
      }
      const code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
      const codeHash = await digest(code);
      const pollHash = await digest(input.pollSecret);
      return this.ctx.blockConcurrencyWhile(async () => {
        if (
          (await this.ctx.storage.get('pairing')) ||
          (await this.ctx.storage.get('session')) ||
          (await this.ctx.storage.get('expired'))
        ) {
          return failure('pairing_exists', 409);
        }
        const pairing: Pairing = {
          tenant: request.headers.get('X-Canvas-Tenant')!,
          session: request.headers.get('X-Canvas-Session')!,
          origin: site.origin,
          codeHash,
          pollHash,
          attempts: 0,
          expiresAt: Date.now() + 300000,
        };
        await this.ctx.storage.put('pairing', pairing);
        await this.ctx.storage.setAlarm(pairing.expiresAt);
        const verification = new URL(
          'ghost/',
          input.siteUrl.endsWith('/') ? input.siteUrl : input.siteUrl + '/',
        );
        verification.hash =
          '#/builder/theme?' +
          new URLSearchParams({ canvasPairSession: pairing.session, canvasPairCode: code });
        return json(
          {
            status: 'pending',
            code,
            verificationUrl: verification.href,
            expiresAt: pairing.expiresAt,
          },
          201,
        );
      });
    }
    const pollSecret = /^Bearer ([a-f0-9]{64})$/.exec(
      request.headers.get('Authorization') ?? '',
    )?.[1];
    const pairing = await this.ctx.storage.get<Pairing>('pairing');
    if (!pollSecret || !pairing || (await digest(pollSecret)) !== pairing.pollHash) {
      return failure('unauthorized', 401);
    }
    if (pairing.expiresAt <= Date.now()) {
      return failure('pairing_expired', 410);
    }
    const session = await this.ctx.storage.get<Session>('session');
    if (session?.revoked) {
      return failure('session_expired', 410);
    }
    return json(
      pairing.agentToken
        ? { status: 'approved', token: pairing.agentToken }
        : { status: 'pending' },
    );
  }
  private async approvePairing(request: Request, claims: RelayClaims): Promise<Response> {
    const input = z
      .object({ code: z.string().regex(/^[A-F0-9]{8}$/), agentToken: z.string() })
      .strict()
      .parse(await body(request));
    const codeHash = await digest(input.code);
    return this.ctx.blockConcurrencyWhile(async () => {
      const pairing = await this.ctx.storage.get<Pairing>('pairing');
      if (!pairing || (!pairing.agentToken && pairing.expiresAt <= Date.now())) {
        return failure('pairing_expired', 410);
      }
      if (
        pairing.origin !== request.headers.get('Origin') ||
        pairing.tenant !== claims.tenant ||
        pairing.session !== claims.session
      ) {
        return failure('origin_rejected', 403);
      }
      if (pairing.attempts >= 5) {
        return failure('pairing_locked', 429);
      }
      if (pairing.codeHash !== codeHash) {
        await this.ctx.storage.put('pairing', { ...pairing, attempts: pairing.attempts + 1 });
        return failure('invalid_pairing_code', 403);
      }
      const session = await this.session(claims);
      if (session instanceof Response) {
        return session;
      }
      // The original code can resume only its approved staff-bound session.
      // Keep the existing agent capability and fixed session expiry unchanged.
      if (pairing.agentToken) {
        return json({ status: 'approved' });
      }
      await this.ctx.storage.put('pairing', { ...pairing, agentToken: input.agentToken });
      return json({ status: 'approved' });
    });
  }
  private async connect(request: Request): Promise<Response> {
    const ticket = new URL(request.url).searchParams.get('ticket') ?? '';
    if (!identifier.safeParse(ticket).success) {
      return failure('unauthorized', 401);
    }
    const hashed = await digest(ticket);
    return this.ctx.blockConcurrencyWhile(async () => {
      const saved = this.ctx.storage.sql
        .exec<{ expires: number; origin: string }>(
          'SELECT expires, origin FROM tickets WHERE id = ?',
          hashed,
        )
        .toArray()[0];
      if (!saved || saved.expires <= Date.now() || saved.origin !== request.headers.get('Origin')) {
        return failure('unauthorized', 401);
      }
      this.ctx.storage.sql.exec('DELETE FROM tickets WHERE id = ?', hashed);
      const session = await this.ctx.storage.get<Session>('session');
      if (!session || session.revoked || session.expiresAt <= Date.now()) {
        return failure('session_expired', 410);
      }
      if (this.editor()) {
        return failure('editor_already_connected', 409);
      }
      const epoch = crypto.randomUUID();
      await this.ctx.storage.put('session', { ...session, epoch, catalog: undefined });
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1], ['editor']);
      pair[1].serializeAttachment({ epoch, expiresAt: session.expiresAt } satisfies Attachment);
      pair[1].send(JSON.stringify({ type: 'connected', epoch, protocolVersion: relayVersion }));
      return new Response(null, { status: 101, webSocket: pair[0] });
    });
  }
  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = socket.deserializeAttachment() as Attachment;
    const session = await this.ctx.storage.get<Session>('session');
    if (
      !session ||
      session.revoked ||
      attachment.expiresAt <= Date.now() ||
      session.epoch !== attachment.epoch
    ) {
      socket.close(1008, 'Session expired');
      return;
    }
    if (typeof message !== 'string' || encoder.encode(message).length > maximumBytes) {
      socket.close(1009, 'Message too large');
      return;
    }
    let input: unknown;
    try {
      input = JSON.parse(message);
    } catch {
      socket.close(1008, 'Invalid message');
      return;
    }
    const hello = z
      .object({ type: z.literal('hello'), tools: catalogSchema })
      .strict()
      .safeParse(input);
    if (hello.success) {
      await this.ctx.storage.put('session', { ...session, catalog: hello.data.tools });
      socket.send(JSON.stringify({ type: 'ready', epoch: attachment.epoch }));
      return;
    }
    const reply = replySchema.safeParse(input);
    if (!reply.success || reply.data.epoch !== attachment.epoch) {
      socket.close(1008, 'Invalid reply');
      return;
    }
    const row = this.rows('SELECT * FROM calls WHERE id = ?', reply.data.id)[0];
    if (!row || row.epoch !== attachment.epoch || row.status === 'completed') {
      return;
    }
    this.ctx.storage.sql.exec(
      'UPDATE calls SET status = ?, result = ?, reason = NULL WHERE id = ?',
      'completed',
      JSON.stringify(reply.data.result),
      row.id,
    );
  }
  webSocketClose(socket: WebSocket, code: number): void {
    const attachment = socket.deserializeAttachment() as Attachment;
    this.ctx.storage.sql.exec(
      'UPDATE calls SET status = ?, reason = ? WHERE epoch = ? AND status = ?',
      'unknown',
      'editor_disconnected',
      attachment.epoch,
      'dispatched',
    );
    socket.close(code === 1006 ? 1000 : code, 'Editor disconnected');
  }
  webSocketError(socket: WebSocket): void {
    this.webSocketClose(socket, 1000);
  }
  private disconnect(reason: string): void {
    this.ctx.storage.sql.exec(
      'UPDATE calls SET status = ?, reason = ? WHERE status = ?',
      'unknown',
      reason,
      'dispatched',
    );
    for (const socket of this.ctx.getWebSockets()) {
      socket.close(1000, reason);
    }
  }
  async alarm(): Promise<void> {
    this.disconnect('session_expired');
    // Delete payloads at session expiry; retain a tombstone so this object cannot
    // silently become a new session using capabilities issued before expiry.
    const session = await this.ctx.storage.get<Session>('session');
    if (session) {
      await this.ctx.storage.put('session', { ...session, catalog: undefined, revoked: true });
    }
    await this.ctx.storage.put('expired', true);
    await this.ctx.storage.delete('pairing');
    this.ctx.storage.sql.exec('DELETE FROM calls');
    this.ctx.storage.sql.exec('DELETE FROM tickets');
  }
}
