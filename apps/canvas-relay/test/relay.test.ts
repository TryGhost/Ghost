import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { Miniflare } from 'miniflare';
import type { WebSocket } from 'miniflare';

const service = 'https://relay.example';
const browserOrigin = 'https://ghost.example';
const keys = { alpha: 'a'.repeat(64), beta: 'b'.repeat(64) };
let mf: Miniflare;
const sockets: WebSocket[] = [];
type Connection = { tenant: keyof typeof keys; session: string; agent: string; editor: string };
async function connection(
  tenant: keyof typeof keys = 'alpha',
  session: string = randomUUID(),
  expiry = '1h',
): Promise<Connection> {
  const token = (role: 'agent' | 'editor') =>
    new SignJWT({ tenant, session, role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('ghost-canvas-relay')
      .setAudience(service)
      .setSubject('owner')
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(new TextEncoder().encode(keys[tenant]));
  return { tenant, session, agent: await token('agent'), editor: await token('editor') };
}
const path = (c: Connection) => `${service}/v1/tenants/${c.tenant}/sessions/${c.session}`;
const request = (
  c: Connection,
  route: string,
  init: { method?: string; body?: unknown; role?: 'agent' | 'editor'; origin?: string } = {},
) =>
  mf.dispatchFetch(path(c) + route, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${c[init.role ?? 'agent']}`,
      ...(init.role === 'editor' ? { Origin: init.origin ?? browserOrigin } : {}),
      'Content-Type': 'application/json',
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
async function open(c: Connection) {
  const ticketResponse = await request(c, '/editor-ticket', { role: 'editor', method: 'POST' });
  expect(ticketResponse.status, await ticketResponse.clone().text()).toBe(200);
  const { ticket } = (await ticketResponse.json()) as { ticket: string };
  const response = await mf.dispatchFetch(path(c) + `/editor?ticket=${ticket}`, {
    headers: { Upgrade: 'websocket', Origin: browserOrigin },
  });
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  sockets.push(socket);
  const messages: Record<string, unknown>[] = [];
  socket.addEventListener('message', (event) => {
    messages.push(event.data === 'pong' ? { type: 'pong' } : JSON.parse(String(event.data)));
  });
  socket.accept();
  await expect.poll(() => messages[0]?.type).toBe('connected');
  const epoch = String(messages[0]!.epoch);
  socket.send(
    JSON.stringify({
      type: 'hello',
      tools: [
        { name: 'ghost_canvas_state', description: 'State', inputSchema: { type: 'object' } },
        { name: 'ghost_canvas_edit', description: 'Edit', inputSchema: { type: 'object' } },
      ],
    }),
  );
  await expect
    .poll(async () => ((await (await request(c, '')).json()) as { ready: boolean }).ready)
    .toBe(true);
  return { socket, epoch, messages, ticket };
}
const call = (epoch: string, input = {}) => ({
  id: randomUUID(),
  epoch,
  tool: 'ghost_canvas_edit',
  input,
});
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(new URL('../build/worker.js', import.meta.url)),
    compatibilityDate: '2026-04-01',
    cf: false,
    durableObjects: { SESSIONS: { className: 'CanvasSession', useSQLite: true } },
    bindings: {
      SERVICE_ORIGIN: service,
      TENANT_KEYS: JSON.stringify(
        Object.fromEntries(
          Object.entries(keys).map(([tenant, secret]) => [
            tenant,
            { secret, origins: [browserOrigin] },
          ]),
        ),
      ),
    },
  });
  await mf.ready;
});
it('answers idle heartbeats through the hibernation auto-response', async () => {
  const c = await connection();
  const editor = await open(c);
  editor.socket.send('ping');
  await expect.poll(() => editor.messages.some((message) => message.type === 'pong')).toBe(true);
  expect((await (await request(c, '/status')).json()) as { ready: boolean }).toMatchObject({
    ready: true,
  });
});
afterAll(async () => {
  sockets.forEach((socket) => {
    if (socket.readyState === 1) {
      socket.close();
    }
  });
  await mf?.dispose();
});

describe('first-party tenant/session relay in workerd', () => {
  it('pairs only after trusted staff approval and keeps the agent secret separate', async () => {
    const c = await connection();
    const pollSecret = 'f'.repeat(64);
    const created = await mf.dispatchFetch(path(c) + '/pairing', {
      method: 'POST',
      headers: { Origin: browserOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl: browserOrigin, pollSecret }),
    });
    expect(created.status).toBe(201);
    const invitation = (await created.json()) as { code: string; verificationUrl: string };
    expect(invitation.verificationUrl).not.toContain(pollSecret);
    expect((await request(c, '/pairing')).status).toBe(401);
    const poll = () =>
      mf.dispatchFetch(path(c) + '/pairing', {
        headers: { Authorization: `Bearer ${pollSecret}` },
      });
    expect(await (await poll()).json()).toEqual({ status: 'pending' });
    expect(
      (await request(c, '/pairing/approve', { method: 'POST', body: { code: invitation.code } }))
        .status,
    ).toBe(403);
    expect(
      (
        await request(c, '/pairing/approve', {
          method: 'POST',
          role: 'editor',
          body: { code: '00000000' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(c, '/pairing/approve', {
          method: 'POST',
          role: 'editor',
          body: { code: invitation.code },
        })
      ).status,
    ).toBe(200);
    const approved = (await (await poll()).json()) as { status: string; token: string };
    expect(approved.status).toBe('approved');
    expect(await (await request({ ...c, agent: approved.token }, '')).json()).toMatchObject({
      ready: false,
    });
    expect(
      (
        await request(c, '/pairing/approve', {
          method: 'POST',
          role: 'editor',
          body: { code: invitation.code },
        })
      ).status,
    ).toBe(200);
    expect((await (await poll()).json()) as { token: string }).toEqual(approved);
    const differentStaff = await new SignJWT({
      tenant: c.tenant,
      session: c.session,
      role: 'editor',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('ghost-canvas-relay')
      .setAudience(service)
      .setSubject('another-owner')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(keys[c.tenant]));
    expect(
      (
        await request({ ...c, editor: differentStaff }, '/pairing/approve', {
          method: 'POST',
          role: 'editor',
          body: { code: invitation.code },
        })
      ).status,
    ).toBe(401);
    await open(c);
    expect(
      (await request({ ...c, agent: approved.token }, '/disconnect', { method: 'POST' })).status,
    ).toBe(200);
    expect((await poll()).status).toBe(410);
    expect((await request(c, '')).status).toBe(410);
    expect(
      (
        await request(c, '/pairing/approve', {
          method: 'POST',
          role: 'editor',
          body: { code: invitation.code },
        })
      ).status,
    ).toBe(410);
  });
  it('pins pairing to the trusted tenant and origin and bounds code guesses', async () => {
    const c = await connection();
    const create = (origin: string, siteUrl: string) =>
      mf.dispatchFetch(path(c) + '/pairing', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, pollSecret: 'e'.repeat(64) }),
      });
    expect((await create('https://attacker.example', 'https://attacker.example')).status).toBe(403);
    expect((await create(browserOrigin, 'https://attacker.example')).status).toBe(403);
    const created = await create(browserOrigin, browserOrigin);
    const { code } = (await created.json()) as { code: string };
    expect((await create(browserOrigin, browserOrigin)).status).toBe(409);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (
          await request(c, '/pairing/approve', {
            method: 'POST',
            role: 'editor',
            body: { code: code === '00000000' ? 'FFFFFFFF' : '00000000' },
          })
        ).status,
      ).toBe(403);
    }
    expect(
      (await request(c, '/pairing/approve', { method: 'POST', role: 'editor', body: { code } }))
        .status,
    ).toBe(429);
    const other = await connection('beta', c.session);
    expect(
      (await request(other, '/pairing/approve', { method: 'POST', role: 'editor', body: { code } }))
        .status,
    ).toBe(410);
  });
  it('bounds concurrent ticket admission and admits only one editor owner', async () => {
    const c = await connection();
    const issued = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(c, '/editor-ticket', { method: 'POST', role: 'editor' }),
      ),
    );
    expect(issued.filter((response) => response.status === 200)).toHaveLength(4);
    expect(issued.filter((response) => response.status === 429)).toHaveLength(4);
    const tickets = await Promise.all(
      issued
        .filter((response) => response.status === 200)
        .map((response) => response.json() as Promise<{ ticket: string }>),
    );
    const upgrades = await Promise.all(
      tickets.map(({ ticket }) =>
        mf.dispatchFetch(path(c) + `/editor?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket', Origin: browserOrigin },
        }),
      ),
    );
    expect(upgrades.filter((response) => response.status === 101)).toHaveLength(1);
    expect(upgrades.filter((response) => response.status === 409)).toHaveLength(3);
    const socket = upgrades.find((response) => response.status === 101)!.webSocket!;
    socket.accept();
    sockets.push(socket);
  });
  it('does not revive an expired session with a newly issued capability', async () => {
    const c = await connection('alpha', randomUUID(), '1s');
    expect((await request(c, '')).status).toBe(200);
    const renewed = await connection('alpha', c.session);
    await expect.poll(async () => (await request(renewed, '')).status, { timeout: 3000 }).toBe(410);
    expect(
      (await request(renewed, '/editor-ticket', { method: 'POST', role: 'editor' })).status,
    ).toBe(410);
  });
  it('requires valid credentials before accessing a tenant or session', async () => {
    const c = await connection();
    expect((await mf.dispatchFetch(path(c))).status).toBe(401);
    expect(
      (
        await mf.dispatchFetch(path(c).replace('/alpha/', '/constructor/'), {
          headers: { Origin: browserOrigin, Authorization: `Bearer ${c.agent}` },
        })
      ).status,
    ).toBe(401);
    expect((await request({ ...c, agent: c.agent.slice(0, -8) + 'tampered' }, '')).status).toBe(
      401,
    );
    expect((await request({ ...c, session: randomUUID() }, '')).status).toBe(401);
    expect((await request({ ...c, tenant: 'beta' }, '')).status).toBe(401);
    const expired = await connection('alpha', randomUUID(), '-1s');
    expect((await request(expired, '')).status).toBe(401);
  });
  it('rejects browser origin impersonation and separates editor/agent roles', async () => {
    const c = await connection();
    expect(
      (
        await request(c, '/editor-ticket', {
          role: 'editor',
          origin: 'https://evil.example',
          method: 'POST',
        })
      ).status,
    ).toBe(403);
    expect((await request(c, '/editor-ticket', { method: 'POST' })).status).toBe(403);
    expect(
      (await request(c, '/calls', { role: 'editor', method: 'POST', body: call(randomUUID()) }))
        .status,
    ).toBe(403);
    expect((await request(c, '/revoke', { method: 'POST' })).status).toBe(403);
    expect(
      (
        await mf.dispatchFetch(path(c) + '/editor-ticket', {
          method: 'POST',
          headers: { Authorization: `Bearer ${c.editor}` },
        })
      ).status,
    ).toBe(403);
  });
  it('isolates identical session IDs across tenants, including catalogs and results', async () => {
    const session = randomUUID();
    const a = await connection('alpha', session);
    const b = await connection('beta', session);
    const editorA = await open(a);
    const editorB = await open(b);
    expect(editorA.epoch).not.toBe(editorB.epoch);
    const operation = call(editorA.epoch, { tenantSpecific: 'alpha' });
    expect((await request(a, '/calls', { method: 'POST', body: operation })).status).toBe(202);
    await expect.poll(() => editorA.messages.filter((m) => m.type === 'call').length).toBe(1);
    expect(editorB.messages.some((m) => m.type === 'call')).toBe(false);
    expect((await request(b, `/calls/${operation.id}`)).status).toBe(404);
    expect((await request(b, '/calls', { method: 'POST', body: operation })).status).toBe(409);
    editorA.socket.send(
      JSON.stringify({
        type: 'result',
        id: operation.id,
        epoch: editorA.epoch,
        result: { status: 'ok', data: { acceptedRevision: 'alpha-only' } },
      }),
    );
    await expect
      .poll(
        async () =>
          ((await (await request(a, `/calls/${operation.id}`)).json()) as { status: string })
            .status,
      )
      .toBe('completed');
    expect(await (await request(a, `/calls/${operation.id}`)).json()).toMatchObject({
      result: { data: { acceptedRevision: 'alpha-only' } },
    });
    expect((await request(b, `/calls/${operation.id}`)).status).toBe(404);
  });
  it('consumes one-time tickets and never silently takes over a connected editor', async () => {
    const c = await connection();
    const editor = await open(c);
    const reused = await mf.dispatchFetch(path(c) + `/editor?ticket=${editor.ticket}`, {
      headers: { Upgrade: 'websocket', Origin: browserOrigin },
    });
    expect(reused.status).toBe(401);
    const second = (await (
      await request(c, '/editor-ticket', { method: 'POST', role: 'editor' })
    ).json()) as { ticket: string };
    const takeover = await mf.dispatchFetch(path(c) + `/editor?ticket=${second.ticket}`, {
      headers: { Upgrade: 'websocket', Origin: browserOrigin },
    });
    expect(takeover.status).toBe(409);
    const foreign = await connection('beta', c.session);
    const cross = await mf.dispatchFetch(path(foreign) + `/editor?ticket=${second.ticket}`, {
      headers: { Upgrade: 'websocket', Origin: browserOrigin },
    });
    expect(cross.status).toBe(401);
  });
  it('durably deduplicates accepted requests and rejects changed payloads', async () => {
    const c = await connection();
    const editor = await open(c);
    const operation = call(editor.epoch);
    await request(c, '/calls', { method: 'POST', body: operation });
    await request(c, '/calls', { method: 'POST', body: operation });
    expect(
      (
        await request(c, '/calls', {
          method: 'POST',
          body: { ...operation, input: { changed: true } },
        })
      ).status,
    ).toBe(409);
    await expect.poll(() => editor.messages.filter((m) => m.type === 'call').length).toBe(1);
    editor.socket.send(
      JSON.stringify({
        type: 'result',
        id: operation.id,
        epoch: editor.epoch,
        result: { status: 'ok', data: { revision: 'accepted' } },
      }),
    );
    await expect
      .poll(
        async () =>
          ((await (await request(c, `/calls/${operation.id}`)).json()) as { status: string })
            .status,
      )
      .toBe('completed');
    expect(
      await (await request(c, '/calls', { method: 'POST', body: operation })).json(),
    ).toMatchObject({ status: 'completed' });
    expect(editor.messages.filter((m) => m.type === 'call')).toHaveLength(1);
  });
  it('does not replay uncertain edits after disconnect or retarget old epochs', async () => {
    const c = await connection();
    const first = await open(c);
    const operation = call(first.epoch);
    await request(c, '/calls', { method: 'POST', body: operation });
    await expect.poll(() => first.messages.some((m) => m.type === 'call')).toBe(true);
    first.socket.close();
    await expect
      .poll(async () => ((await (await request(c, '')).json()) as { connected: boolean }).connected)
      .toBe(false);
    expect(await (await request(c, `/calls/${operation.id}`)).json()).toMatchObject({
      status: 'unknown',
      reason: 'editor_disconnected',
    });
    const second = await open(c);
    expect(second.epoch).not.toBe(first.epoch);
    expect(
      await (await request(c, '/calls', { method: 'POST', body: operation })).json(),
    ).toMatchObject({ status: 'unknown' });
    expect((await request(c, '/calls', { method: 'POST', body: call(first.epoch) })).status).toBe(
      409,
    );
    expect(second.messages.some((m) => m.type === 'call')).toBe(false);
  });
  it('refuses offline work, unsupported operations and malformed inputs', async () => {
    const c = await connection();
    expect((await request(c, '/calls', { method: 'POST', body: call(randomUUID()) })).status).toBe(
      503,
    );
    const editor = await open(c);
    expect(
      (
        await request(c, '/calls', {
          method: 'POST',
          body: { ...call(editor.epoch), tool: 'publish' },
        })
      ).status,
    ).toBe(400);
    expect(
      (await request(c, '/calls', { method: 'POST', body: { ...call(editor.epoch), extra: true } }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(c, '/calls', {
          method: 'POST',
          body: call(editor.epoch, { text: 'a'.repeat(1024 * 1024) }),
        })
      ).status,
    ).toBe(400);
    expect(editor.messages.some((m) => m.type === 'call')).toBe(false);
  });
  it('bounds the durable ledger without evicting IDs that could later replay', async () => {
    const c = await connection();
    const editor = await open(c);
    const first = call(editor.epoch);
    for (let index = 0; index < 128; index += 1) {
      const operation = index === 0 ? first : call(editor.epoch);
      expect((await request(c, '/calls', { method: 'POST', body: operation })).status).toBe(202);
    }
    expect((await request(c, '/calls', { method: 'POST', body: call(editor.epoch) })).status).toBe(
      429,
    );
    expect((await request(c, '/calls', { method: 'POST', body: first })).status).toBe(200);
  });
  it('revokes one session without interrupting another tenant', async () => {
    const c = await connection();
    const other = await connection('beta');
    await open(c);
    await open(other);
    expect((await request(c, '/revoke', { method: 'POST', role: 'editor' })).status).toBe(200);
    expect((await request(c, '')).status).toBe(410);
    expect((await request(c, '/editor-ticket', { method: 'POST', role: 'editor' })).status).toBe(
      410,
    );
    expect(await (await request(other, '')).json()).toMatchObject({ ready: true });
  });
});
