import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/index.js';
import { validateServiceUrl } from '../src/lib/canvas-client.js';

let dir: string;
let file: string;
const serviceUrl = 'https://ghost.example/__admin-dev__/canvas-relay';
const tenant = 'alpha';
const session = randomUUID();
const epoch = randomUUID();
const connection = { serviceUrl, tenant, session, token: 'private-agent-capability' };
const fetchMock = vi.fn<typeof fetch>();
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const invoke = (action: string, ...args: string[]) =>
  run(['node', 'ghst', '--json', 'canvas', action, '--connection', file, ...args]);
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ghst-canvas-test-'));
  file = join(dir, 'connection.json');
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('canvas CLI pairing and live actions', () => {
  it('creates a private pending connection from Ghost discovery without credentials in output', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({
          site: { url: 'https://ghost.example/', canvas_relay: { url: serviceUrl, tenant } },
        }),
      )
      .mockResolvedValueOnce(
        response(
          {
            code: '1234ABCD',
            verificationUrl: 'https://ghost.example/ghost/#/builder/theme',
            expiresAt: Date.now() + 300000,
          },
          201,
        ),
      );
    expect(await invoke('connect', '--url', 'https://ghost.example', '--no-wait')).toBe(0);
    const saved = JSON.parse(await readFile(file, 'utf8')) as { pollSecret: string; token: string };
    expect(saved.pollSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.token).toBe('');
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    const logs = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(logs).not.toContain(saved.pollSecret);
    expect(logs).toContain('1234ABCD');
    const request = fetchMock.mock.calls[1]!;
    expect(request[0]).toContain(serviceUrl + '/v1/tenants/alpha/sessions/');
    expect((request[1]!.headers as Record<string, string>).Origin).toBe('https://ghost.example');
  });
  it('finishes human-approved pairing and removes the poll secret from disk', async () => {
    await writeFile(
      file,
      JSON.stringify({
        ...connection,
        token: '',
        pollSecret: 'f'.repeat(64),
        expiresAt: Date.now() + 300000,
      }),
    );
    fetchMock
      .mockResolvedValueOnce(response({ status: 'approved', token: connection.token }))
      .mockResolvedValueOnce(response({ ready: true, tools: [{ name: 'ghost_canvas_state' }] }));
    expect(await invoke('wait')).toBe(0);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(connection);
    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).not.toContain(connection.token);
  });
  it('connects and waits in one command after staff approval', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({
          site: { url: 'https://ghost.example/', canvas_relay: { url: serviceUrl, tenant } },
        }),
      )
      .mockResolvedValueOnce(
        response({
          code: '1234ABCD',
          verificationUrl: 'https://ghost.example/ghost/#/builder/theme',
          expiresAt: Date.now() + 300000,
        }),
      )
      .mockResolvedValueOnce(response({ status: 'approved', token: connection.token }))
      .mockResolvedValueOnce(response({ ready: true, tools: [] }));
    expect(await invoke('connect', '--url', 'https://ghost.example')).toBe(0);
    expect(JSON.parse(await readFile(file, 'utf8')).token).toBe(connection.token);
  });
  it.each(['state', 'read', 'edit', 'inspect', 'content', 'history', 'reveal', 'review'])(
    'dispatches %s once with a durable operation ID and clean JSON input',
    async (action) => {
      await writeFile(file, JSON.stringify(connection));
      const input = join(dir, 'input.json');
      await writeFile(input, JSON.stringify({ context: { revision: 'current' } }));
      fetchMock
        .mockResolvedValueOnce(response({ ready: true, epoch }))
        .mockResolvedValueOnce(
          response({ status: 'completed', result: { status: 'ok', data: { ready: true } } }),
        );
      const id = randomUUID();
      expect(await invoke(action, '--input', input, '--id', id)).toBe(0);
      const request = fetchMock.mock.calls[1]!;
      expect(JSON.parse(String(request[1]?.body))).toEqual({
        id,
        epoch,
        tool: `ghost_canvas_${action}`,
        input: { context: { revision: 'current' } },
      });
      expect((request[1]!.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${connection.token}`,
      );
      expect(request[1]?.redirect).toBe('error');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(vi.mocked(console.error).mock.calls[0]?.[0]).toContain(id);
    },
  );
  it('observes an accepted operation with GET, without replaying its POST', async () => {
    await writeFile(file, JSON.stringify(connection));
    fetchMock
      .mockResolvedValueOnce(response({ ready: true, epoch }))
      .mockResolvedValueOnce(response({ status: 'dispatched' }))
      .mockResolvedValueOnce(response({ status: 'completed', result: { status: 'ok' } }));
    expect(await invoke('state', '--id', randomUUID())).toBe(0);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/calls/');
  });
  it('does not retry a lost mutation reply or an unknown outcome', async () => {
    await writeFile(file, JSON.stringify(connection));
    fetchMock
      .mockResolvedValueOnce(response({ ready: true, epoch }))
      .mockRejectedValueOnce(new Error('reply lost'));
    expect(await invoke('edit')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(response({ ready: true, epoch }))
      .mockResolvedValueOnce(response({ status: 'unknown', reason: 'editor_disconnected' }));
    expect(await invoke('edit')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('reports an editor action error without treating it as success', async () => {
    await writeFile(file, JSON.stringify(connection));
    fetchMock
      .mockResolvedValueOnce(response({ ready: true, epoch }))
      .mockResolvedValueOnce(
        response({ status: 'completed', result: { status: 'error', code: 'stale_revision' } }),
      );
    expect(await invoke('edit')).toBe(1);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('OPERATION_INCOMPLETE');
  });
  it.each(['status', 'tools', 'disconnect'])(
    'exposes compact %s output and explicit disconnect',
    async (action) => {
      await writeFile(file, JSON.stringify(connection));
      fetchMock.mockResolvedValue(
        response({
          ready: true,
          connected: true,
          epoch,
          tools: [{ name: 'ghost_canvas_state' }],
          status: 'revoked',
        }),
      );
      expect(await invoke(action, ...(action === 'tools' ? ['--schemas'] : []))).toBe(0);
      expect(fetchMock.mock.calls[0]?.[0]).toContain(
        action === 'disconnect' ? '/disconnect' : '/status',
      );
      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe(
        action === 'disconnect' ? 'POST' : undefined,
      );
    },
  );
  it('reads an existing operation ID and rejects malformed IDs before dispatch', async () => {
    await writeFile(file, JSON.stringify(connection));
    const id = randomUUID();
    fetchMock.mockResolvedValue(response({ id, status: 'completed' }));
    expect(
      await run(['node', 'ghst', '--json', 'canvas', 'result', id, '--connection', file]),
    ).toBe(0);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/calls/' + id);
    fetchMock.mockReset();
    expect(
      await run(['node', 'ghst', '--json', 'canvas', 'result', '../wrong', '--connection', file]),
    ).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects an offline editor before admitting an edit', async () => {
    await writeFile(file, JSON.stringify(connection));
    fetchMock.mockResolvedValue(response({ ready: false }));
    expect(await invoke('edit')).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('reports expired pairings and server errors without leaking tokens', async () => {
    await writeFile(
      file,
      JSON.stringify({ ...connection, pollSecret: 'e'.repeat(64), expiresAt: Date.now() - 1000 }),
    );
    expect(await invoke('wait')).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response({ code: 'session_expired' }, 410));
    expect(await invoke('status')).toBe(1);
    fetchMock.mockResolvedValueOnce(response({}, 503));
    expect(await invoke('status')).toBe(1);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).not.toContain(connection.token);
  });
  it('rejects missing support, different canonical origins and existing connection files', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 404));
    expect(await invoke('connect', '--url', 'https://ghost.example', '--no-wait')).toBe(1);
    fetchMock.mockResolvedValueOnce(
      response({
        site: { url: 'https://other.example', canvas_relay: { url: serviceUrl, tenant } },
      }),
    );
    expect(await invoke('connect', '--url', 'https://ghost.example', '--no-wait')).toBe(1);
    await writeFile(file, JSON.stringify(connection));
    fetchMock.mockResolvedValueOnce(
      response({
        site: { url: 'https://ghost.example', canvas_relay: { url: serviceUrl, tenant } },
      }),
    );
    expect(await invoke('connect', '--url', 'https://ghost.example', '--no-wait')).toBe(1);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(connection);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('pins relay URLs and allows scoped paths and local loopback HTTP', () => {
    expect(validateServiceUrl(serviceUrl + '/')).toBe(serviceUrl);
    expect(validateServiceUrl('http://localhost:8787')).toBe('http://localhost:8787');
    for (const value of [
      'http://external.example',
      'https://user:password@ghost.example',
      'https://ghost.example/?query=yes',
      'https://ghost.example/#fragment',
      'https://ghost.example/bad.path',
    ]) {
      expect(() => validateServiceUrl(value)).toThrow();
    }
  });
});

describe('canvas native editing commands', () => {
  const context = { workspaceId: 'workspace', revision: 'revision-1', generation: 0 };
  const tools = ['state', 'read', 'edit'].map((action) => ({ name: `ghost_canvas_${action}` }));
  const calls: { tool: string; input: Record<string, unknown> }[] = [];
  const ok = (data: unknown) => response({ status: 'completed', result: { status: 'ok', data } });
  beforeEach(async () => {
    calls.length = 0;
    await writeFile(file, JSON.stringify(connection));
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      if (call.tool === 'ghost_canvas_state') return ok({ context });
      if (call.tool === 'ghost_canvas_read')
        return ok({
          results: call.input.requests.map((request: { path: string }) => ({
            status: 'ok',
            data: { path: request.path, content: 'Original source', nextOffset: null },
          })),
        });
      return ok({
        revision: 'revision-2',
        unchanged: false,
        delivery: { status: 'ready', ready: 20, total: 20, failedSurfaces: [] },
      });
    });
  });
  it('reads clean source and applies an atomic native patch using its last-read revision', async () => {
    expect(await run(['node', 'ghst', 'canvas', 'read', 'default.hbs', '--connection', file])).toBe(
      0,
    );
    expect(vi.mocked(console.log).mock.calls[0]?.[0]).toBe('Original source');
    expect(console.error).not.toHaveBeenCalled();
    const local = join(dir, 'header.hbs');
    await writeFile(local, 'New source');
    expect(
      await invoke(
        'edit',
        '--write',
        `default.hbs=${local}`,
        '--set',
        'theme.background_image=false',
        'theme.header_text=An editorial journal',
      ),
    ).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      context,
      files: [{ operation: 'write', path: 'default.hbs', content: 'New source' }],
      settings: { 'theme.background_image': false, 'theme.header_text': 'An editorial journal' },
      wait: true,
      dryRun: false,
    });
    expect(calls.filter((call) => call.tool === 'ghost_canvas_state')).toHaveLength(1);
    expect(await invoke('replace', 'default.hbs', '--old', 'New', '--new', 'Better')).toBe(0);
    expect(calls.at(-1)?.input.context).toEqual({ ...context, revision: 'revision-2' });
  });
  it('assembles long sources without exposing pagination or changing revision between excerpts', async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      if (call.tool === 'ghost_canvas_state') return ok({ context });
      const request = call.input.requests[0];
      return ok({
        results: [
          {
            status: 'ok',
            data: {
              path: request.path,
              content: request.offset ? 'second' : 'first',
              truncated: !request.offset,
              nextOffset: request.offset ? null : 5,
            },
          },
        ],
      });
    });
    expect(await run(['node', 'ghst', 'canvas', 'read', 'screen.css', '--connection', file])).toBe(
      0,
    );
    expect(vi.mocked(console.log).mock.calls[0]?.[0]).toBe('firstsecond');
    expect(await invoke('read', 'screen.css')).toBe(0);
    const readResult = JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]));
    expect(readResult).toMatchObject({
      content: 'firstsecond',
      truncated: false,
      complete: true,
      length: 11,
      nextOffset: null,
    });
    expect(
      calls.filter((call) => call.tool === 'ghost_canvas_read').map((call) => call.input.context),
    ).toEqual([context, context, context, context]);
  });
  it('fails unavailable remote actions clearly without dispatching them', async () => {
    fetchMock.mockResolvedValue(response({ ready: true, epoch, tools: [] }));
    expect(await invoke('read', 'default.hbs')).toBe(1);
    expect(calls).toHaveLength(0);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('ACTION_UNAVAILABLE');
  });
  it('does not refresh a stale write guard or retry a rejected edit', async () => {
    expect(await invoke('read', 'default.hbs')).toBe(0);
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      return response({
        status: 'completed',
        result: { status: 'error', code: 'stale_revision', message: 'Read current files again.' },
      });
    });
    expect(await invoke('replace', 'default.hbs', '--old', 'Original', '--new', 'New')).toBe(6);
    expect(calls.filter((call) => call.tool === 'ghost_canvas_edit')).toHaveLength(1);
    expect(calls.at(-1)?.input.context).toEqual(context);
  });
  it('never retries a native mutation when its reply is lost', async () => {
    expect(await invoke('read', 'default.hbs')).toBe(0);
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      calls.push(JSON.parse(String(init.body)));
      throw new Error('reply lost');
    });
    expect(await invoke('replace', 'default.hbs', '--old', 'Original', '--new', 'New')).toBe(1);
    expect(calls.filter((call) => call.tool === 'ghost_canvas_edit')).toHaveLength(1);
    expect(vi.mocked(console.error).mock.calls.flat().join('\n')).toContain('Operation:');
  });
  it('rejects duplicate files and mixed raw/native arguments before network access', async () => {
    const local = join(dir, 'header.hbs');
    await writeFile(local, 'New source');
    expect(await invoke('edit', '--write', `default.hbs=${local}`, `default.hbs=${local}`)).toBe(2);
    expect(await invoke('read', 'default.hbs', '--input', local)).toBe(2);
    expect(await invoke('edit', '--input', local, '--dry-run')).toBe(2);
    expect(await invoke('edit', '--dry-run')).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retains a prior read guard when a later batch read fails', async () => {
    expect(await invoke('read', 'default.hbs')).toBe(0);
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      if (call.tool === 'ghost_canvas_state')
        return ok({ context: { ...context, revision: 'newer' } });
      return ok({ results: [{ status: 'error', code: 'file_not_found' }] });
    });
    expect(await invoke('read', 'missing.hbs')).toBe(1);
    expect(JSON.parse(await readFile(file + '.context.json', 'utf8')).context).toEqual(context);
  });
  it('maps native frame, history and content commands to the current remote handles', async () => {
    const representation = {
      representationHandle: 'representation',
      revision: context.revision,
      renderKey: 'render-key',
      documentId: 'document',
      documentInstanceId: 'instance',
      status: 'current',
    };
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body)
        return response({
          ready: true,
          epoch,
          tools: ['state', 'inspect', 'reveal', 'history', 'content', 'review'].map((action) => ({
            name: `ghost_canvas_${action}`,
          })),
        });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      if (call.tool === 'ghost_canvas_state')
        return ok({
          context,
          theme: { name: 'source' },
          editor: { dirty: false },
          frames: [
            {
              id: 'home-desktop',
              label: 'Home · Desktop',
              frameHandle: 'frame',
              device: representation,
              expanded: representation,
            },
          ],
        });
      return ok({ accepted: true });
    });
    expect(await invoke('state')).toBe(0);
    expect(await invoke('frames')).toBe(0);
    expect(await invoke('inspect', 'home-desktop', '--occurrence', 'heading')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      target: {
        workspaceId: context.workspaceId,
        frameHandle: 'frame',
        representationHandle: 'representation',
        expectedRevision: context.revision,
        expectedRenderKey: 'render-key',
        documentId: 'document',
        documentInstanceId: 'instance',
      },
      occurrence: 'heading',
    });
    expect(await invoke('reveal', 'home-desktop')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({ context, frame: 'home-desktop' });
    expect(await invoke('history', 'list')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({ context, operation: 'list' });
    expect(await invoke('history', 'restore', '--checkpoint', 'before-edit')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      context,
      operation: 'restore',
      checkpoint: 'before-edit',
    });
    expect(await invoke('content', 'list', '--kind', 'page')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({ context, operation: 'list', kind: 'page' });
    expect(
      await invoke(
        'content',
        'select',
        '--kind',
        'post',
        '--content-id',
        'post-1',
        '--template',
        'post.hbs',
      ),
    ).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      context,
      operation: 'select',
      kind: 'post',
      id: 'post-1',
      template: 'post.hbs',
    });
    expect(await invoke('review')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({ context });
  });
  it('offers native files, settings and constrained search reads', async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      if (call.tool === 'ghost_canvas_state') return ok({ context });
      const request = call.input.requests[0];
      const data =
        request.operation === 'files'
          ? { files: [{ path: 'default.hbs' }] }
          : request.operation === 'settings'
            ? {
                settings: [
                  {
                    identifier: 'theme.header_text',
                    stagedValue: 'Journal',
                    currentValue: null,
                    defaultValue: null,
                    visible: true,
                    writable: true,
                    type: 'text',
                  },
                ],
              }
            : { matches: [{ path: request.path, excerpt: request.query }] };
      return ok({ results: [{ status: 'ok', data }] });
    });
    expect(await run(['node', 'ghst', 'canvas', 'files', '--connection', file])).toBe(0);
    expect(vi.mocked(console.log).mock.calls.at(-1)?.[0]).toBe('default.hbs');
    expect(await run(['node', 'ghst', 'canvas', 'settings', '--connection', file])).toBe(0);
    expect(vi.mocked(console.log).mock.calls.at(-1)?.[0]).toBe(
      'theme.header_text = "Journal" (text; editable; visible)\n  Default: null',
    );
    expect(await invoke('search', 'masthead', '--path', 'default.hbs')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      context,
      requests: [{ operation: 'search', query: 'masthead', path: 'default.hbs' }],
    });
  });
  it('writes a file natively and supports dry runs without advancing the read guard', async () => {
    const local = join(dir, 'header.hbs');
    await writeFile(local, 'New source');
    expect(await invoke('write', 'default.hbs', '--file', local, '--dry-run')).toBe(0);
    expect(calls.at(-1)?.input).toEqual({
      context,
      files: [{ operation: 'write', path: 'default.hbs', content: 'New source' }],
      dryRun: true,
      wait: true,
    });
    expect(JSON.parse(await readFile(file + '.context.json', 'utf8')).context).toEqual(context);
    expect(
      await invoke('write', 'default.hbs', '--file', local, '--expected-revision', 'wrong'),
    ).toBe(6);
    expect(calls.filter((call) => call.tool === 'ghost_canvas_edit')).toHaveLength(1);
  });
  it('summarizes discovery without schemas, including linked CSS and build limitations', async () => {
    const catalog = tools.map((tool) => ({
      ...tool,
      inputSchema: { hugeSchema: 'not for ordinary discovery' },
    }));
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, connected: true, epoch, tools: catalog });
      return ok({
        context,
        capabilities: { visualVerification: 'native-browser-screenshot' },
        editor: {
          cssEditing: {
            themeBuilds: false,
            linkedStylesheets: [{ path: 'assets/css/editorial.css', mode: 'direct-edit' }],
          },
        },
      });
    });
    expect(await invoke('tools')).toBe(0);
    const summary = JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]));
    expect(summary).toMatchObject({
      actions: ['state', 'read', 'edit'],
      screenshots: false,
      css: { themeBuilds: false, linkedStylesheets: [{ path: 'assets/css/editorial.css' }] },
    });
    expect(JSON.stringify(summary)).not.toContain('inputSchema');
    expect(await run(['node', 'ghst', 'canvas', 'tools', '--connection', file])).toBe(0);
    expect(String(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toContain(
      'subsequent commands do not need --url',
    );
    expect(await invoke('tools', '--schemas')).toBe(0);
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]))).toEqual(catalog);
  });
  it('shows effective false/null settings and their defaults, choices, visibility and incomplete metadata', async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      if (call.tool === 'ghost_canvas_state') return ok({ context });
      return ok({
        results: [
          {
            status: 'ok',
            data: {
              settings: [
                {
                  identifier: 'theme.background_image',
                  type: 'boolean',
                  stagedValue: false,
                  currentValue: true,
                  defaultValue: true,
                  writable: true,
                  visible: false,
                  visibility: 'header_style:[Landing, Search]',
                  description: 'Publication cover',
                },
                {
                  identifier: 'theme.title_font',
                  type: 'select',
                  stagedValue: 'Elegant serif',
                  defaultValue: 'Modern sans-serif',
                  choices: ['Elegant serif', 'Modern sans-serif'],
                  truncatedFields: ['description'],
                },
                { identifier: 'global.logo', type: 'image', currentValue: null, writable: false },
              ],
              nextOffset: null,
            },
          },
        ],
      });
    });
    expect(await run(['node', 'ghst', 'canvas', 'settings', '--connection', file])).toBe(0);
    const text = String(vi.mocked(console.log).mock.calls.at(-1)?.[0]);
    expect(text).toContain('theme.background_image = false (boolean; editable; hidden)');
    expect(text).toContain('Default: true');
    expect(text).toContain('Visible when: header_style:[Landing, Search]');
    expect(text).toContain('Choices: "Elegant serif", "Modern sans-serif"');
    expect(text).toContain('Incomplete metadata: description');
    expect(text).toContain('global.logo = null (image; read-only; visible)');
    expect(text).not.toContain('undefined');
    expect(await invoke('settings')).toBe(0);
    const result = JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]));
    expect(result.settings[0].effectiveValue).toBe(false);
    expect(result.settings[2].effectiveValue).toBe(null);
  });
  it('returns an accepted edit summary with source/renderer validation and authoritative undo checkpoints', async () => {
    const local = join(dir, 'header.hbs');
    await writeFile(local, 'New source');
    fetchMock.mockImplementation(async (_url, init) => {
      if (!init?.body) return response({ ready: true, epoch, tools });
      const call = JSON.parse(String(init.body));
      calls.push(call);
      if (call.tool === 'ghost_canvas_state') return ok({ context });
      return ok({
        revision: 'revision-2',
        history: { checkpoint: 'after', undoCheckpoint: 'before' },
        validation: { source: 'valid', renderer: 'valid', appearance: 'not-checked' },
        delivery: { status: 'ready', ready: 20, total: 20, failedSurfaces: [] },
      });
    });
    expect(
      await run([
        'node',
        'ghst',
        'canvas',
        'edit',
        '--connection',
        file,
        '--write',
        `default.hbs=${local}`,
        '--set',
        'theme.background_image=false',
      ]),
    ).toBe(0);
    const text = String(vi.mocked(console.log).mock.calls.at(-1)?.[0]);
    expect(text).toContain('Files: default.hbs (write)');
    expect(text).toContain('Settings: theme.background_image=false');
    expect(text).toContain('Validation: source=valid, renderer=valid, appearance=not-checked');
    expect(text).toContain('Undo: ghst canvas history restore --checkpoint before');
    expect(text).toContain('Checkpoint: after');
    expect(calls.filter((call) => call.tool === 'ghost_canvas_edit')).toHaveLength(1);
    expect(calls.filter((call) => call.tool === 'ghost_canvas_state')).toHaveLength(1);
  });
});
