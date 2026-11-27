import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../cli.ts', import.meta.url));
const secret = 'ab'.repeat(32); // Synthetic test credential; never contacts a real site.
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function run(args: string[], root: string, url: string, auth = `test-id:${secret}`) {
  const child = spawn(process.execPath, [cli, 'generate', 'golden-email', ...args], {
    cwd: root,
    env: { GHOST_URL: url, GHOST_GOLDEN_POST_AUTH: auth },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => {
    stdout += data;
  });
  child.stderr.on('data', (data) => {
    stderr += data;
  });
  const [code] = await once(child, 'exit');
  return { code, stdout, stderr };
}

for (const previewFails of [false, true]) {
  test(`golden email ${previewFails ? 'propagates preview failure' : 'writes the preview'} and cleans up its draft`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'gx-golden-'));
    roots.push(root);
    const requests: { method: string; url: string; body: string; auth: string }[] = [];
    const server = createServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
      }
      requests.push({
        method: request.method!,
        url: request.url!,
        body,
        auth: request.headers.authorization!,
      });
      response.setHeader('Content-Type', 'application/json');
      if (request.method === 'POST') {
        response.end(JSON.stringify({ posts: [{ id: 'test-post' }] }));
      } else if (request.method === 'GET') {
        response.statusCode = previewFails ? 500 : 200;
        response.end(JSON.stringify({ email_previews: [{ html: '<p>Golden preview</p>' }] }));
      } else {
        response.statusCode = 204;
        response.end();
      }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(
      () =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    );
    const address = server.address();
    assert(address && typeof address !== 'string');
    const segment = 'status:free+test&other=value';
    const result = await run([segment, 'preview.html'], root, `http://127.0.0.1:${address.port}`);
    assert.equal(result.code, previewFails ? 1 : 0, result.stderr);
    assert.deepEqual(
      requests.map((request) => request.method),
      ['POST', 'GET', 'DELETE'],
    );
    assert.deepEqual(
      requests.map((request) => new URL(request.url, 'http://test').pathname),
      [
        '/ghost/api/admin/posts/',
        '/ghost/api/admin/email_previews/posts/test-post/',
        '/ghost/api/admin/posts/test-post/',
      ],
    );
    for (const request of requests) {
      assert.equal(new URL(request.url, 'http://test').searchParams.get('god_mode'), 'true');
      const [header, payload, signature] = request.auth.replace('Ghost ', '').split('.');
      assert(header && payload && signature);
      assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).kid, 'test-id');
      assert.equal(JSON.parse(Buffer.from(payload, 'base64url').toString()).aud, '/admin/');
      assert.equal(
        signature,
        createHmac('sha256', Buffer.from(secret, 'hex'))
          .update(`${header}.${payload}`)
          .digest('base64url'),
      );
    }
    const created = JSON.parse(requests[0]!.body).posts[0];
    assert.equal(created.status, 'draft');
    assert.deepEqual(
      JSON.parse(created.lexical),
      JSON.parse(
        await readFile(
          new URL(
            '../../../ghost/test/utils/fixtures/email-service/golden-post.json',
            import.meta.url,
          ),
          'utf8',
        ),
      ),
    );
    assert.equal(
      new URL(requests[1]!.url, 'http://test').searchParams.get('memberSegment'),
      segment,
    );
    if (previewFails) {
      assert.match(result.stderr, /failed \(500\)/);
      await assert.rejects(readFile(join(root, 'preview.html')), { code: 'ENOENT' });
    } else {
      assert.equal(await readFile(join(root, 'preview.html'), 'utf8'), '<p>Golden preview</p>');
      assert.match(result.stdout, /Golden email written/);
    }
  });
}

test('golden email preserves usage and missing-credential errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gx-golden-'));
  roots.push(root);
  const usage = await run([], root, 'http://127.0.0.1:1', '');
  assert.equal(usage.code, 1);
  assert.match(usage.stderr, /pnpm gx generate golden-email/);
  const missingAuth = await run(['status:free', 'preview.html'], root, 'http://127.0.0.1:1', '');
  assert.equal(missingAuth.code, 1);
  assert.match(missingAuth.stderr, /environment variable is required/);
});
