import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLiveWebMcpCaller } from '../lib/webmcp-live-call.js';

const origin = 'https://example.com';
const pageUrl = origin + '/ghost/';
const baseName = 'ghost_canvas_edit';
const descriptor = (alias, overrides = {}) => ({
  name: `${baseName}__${alias}`,
  origin,
  pageUrl,
  description: 'Edit the current workspace',
  inputSchema: { type: 'object' },
  ...overrides,
});
function fixture(lists, execute = async () => 'accepted') {
  let discoveries = 0;
  const calls = [];
  const webmcp = {
    async fetchTools() {
      const tools = lists[discoveries];
      discoveries += 1;
      return {
        description: () => `Current site tools\n${JSON.stringify(tools)}\nEnd`,
        call: (...args) => {
          calls.push(args);
          return execute(...args);
        },
      };
    },
  };
  return {
    call: createLiveWebMcpCaller(webmcp, { origin, pageUrl }),
    calls,
    discoveries: () => discoveries,
  };
}

test('resolves the current alias for each sequential call and preserves input/options', async () => {
  const f = fixture([[descriptor('first')], [descriptor('second')]]);
  const input = { context: { revision: 'current' } };
  const options = { timeoutMs: 1000 };
  await f.call(baseName, input, options);
  await f.call(baseName, input, options);
  assert.deepEqual(
    f.calls.map((args) => args[0]),
    [`${baseName}__first`, `${baseName}__second`],
  );
  assert.equal(f.calls[0][1], input);
  assert.equal(f.calls[0][2], options);
  assert.equal(f.discoveries(), 2);
});
test('rejects definition changes before dispatching', async () => {
  const f = fixture([
    [descriptor('first')],
    [descriptor('second', { inputSchema: { type: 'string' } })],
  ]);
  await f.call(baseName, {});
  await assert.rejects(f.call(baseName, {}), /Definition changed/);
  assert.equal(f.calls.length, 1);
});
test('pins both origin and page URL and rejects ambiguous owners', async () => {
  for (const tools of [
    [descriptor('other-origin', { origin: 'https://other.example' })],
    [descriptor('other-page', { pageUrl: origin + '/other/' })],
    [descriptor('one'), descriptor('two')],
    [],
  ]) {
    const f = fixture([tools]);
    await assert.rejects(f.call(baseName, {}), /Expected one/);
    assert.equal(f.calls.length, 0);
  }
});
test('never replays a failed or timed-out mutation', async () => {
  for (const message of ['registration is stale', 'timeout after acceptance']) {
    const error = new Error(message);
    const f = fixture([[descriptor('first')]], async () => {
      throw error;
    });
    await assert.rejects(f.call(baseName, {}), (value) => value === error);
    assert.equal(f.calls.length, 1);
    assert.equal(f.discoveries(), 1);
  }
});
test('rejects overlapping calls, then allows a later sequential call', async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture([[descriptor('first')], [descriptor('second')]], () => pending);
  const first = f.call(baseName, {});
  await assert.rejects(f.call(baseName, {}), /must be sequential/);
  assert.equal(f.discoveries(), 1);
  release('accepted');
  assert.equal(await first, 'accepted');
  assert.equal(await f.call(baseName, {}), 'accepted');
  assert.equal(f.discoveries(), 2);
});
test('releases the sequential guard after discovery or dispatch failure without retrying', async () => {
  const f = fixture([[descriptor('first')], [descriptor('second')]], async (name) => {
    if (name.endsWith('first')) {
      throw new Error('stale');
    }
    return 'accepted';
  });
  await assert.rejects(f.call(baseName, {}), /stale/);
  assert.equal(await f.call(baseName, {}), 'accepted');
  assert.equal(f.calls.length, 2);
});
test('rejects missing pins, mismatched origin, and callable aliases', async () => {
  assert.throws(() => createLiveWebMcpCaller({}), /Pin/);
  assert.throws(
    () => createLiveWebMcpCaller({}, { origin, pageUrl: 'https://other.example/ghost/' }),
    /pinned origin/,
  );
  const f = fixture([]);
  await assert.rejects(f.call(baseName + '__old', {}), /stable base/);
  assert.equal(f.discoveries(), 0);
});
test('fails closed on malformed textual catalogs without dispatching', async () => {
  for (const description of ['No tools', 'Tools: [not json]', 'Tools: [{"name":null}]']) {
    let dispatched = false;
    const call = createLiveWebMcpCaller(
      {
        fetchTools: async () => ({
          description: () => description,
          call: () => {
            dispatched = true;
          },
        }),
      },
      { origin, pageUrl },
    );
    await assert.rejects(call(baseName, {}));
    assert.equal(dispatched, false);
  }
});
