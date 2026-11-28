import assert from 'node:assert/strict';
import { createJsonStream } from '../../../../../core/server/data/exporter/json-stream';

async function collect(value: object): Promise<{ text: string; chunks: string[] }> {
  const chunks: string[] = [];
  for await (const chunk of createJsonStream(value)) {
    chunks.push(chunk.toString('utf8'));
  }
  return { text: chunks.join(''), chunks };
}

describe('createJsonStream', function () {
  const cases: Array<[string, object]> = [
    ['an empty object', {}],
    ['an empty array', []],
    [
      'an export-shaped document',
      {
        db: [
          {
            meta: { exported_on: 1700000000000, version: '6.0.0' },
            data: {
              posts: [
                { id: '1', title: 'Hello "world"', html: '<p>ü ✓  </p>', published_at: null },
                { id: '2', title: 'Second', featured: true, sort_order: 0 },
              ],
              tags: [],
              settings: [{ key: 'title', value: 'Example' }],
            },
          },
        ],
      },
    ],
    [
      'values that need toJSON',
      {
        created_at: new Date(Date.UTC(2024, 0, 2)),
        blob: Buffer.from('ab'),
        rows: [{ at: new Date(0) }],
      },
    ],
    [
      'values JSON.stringify omits or nulls',
      {
        skipped: undefined,
        fn: () => {},
        sym: Symbol('x'),
        list: [undefined, () => {}, Symbol('y'), 1],
        nested: { inner: { skipped: undefined, kept: 1 } },
        rows: [{ skipped: undefined, kept: 'x' }],
      },
    ],
    ['sparse arrays', { list: new Array(3), nested: [Object.assign(new Array(3), { 0: 1 })] }],
    ['deeply nested containers', { a: [{ b: [{ c: [{ d: [1, 2, { e: 'f' }] }] }] }] }],
    ['a root array of rows', [{ id: 1 }, { id: 2 }]],
    ['a value with its own toJSON', { toJSON: () => ({ replaced: true }) }],
  ];

  for (const [description, value] of cases) {
    it(`matches JSON.stringify for ${description}`, async function () {
      const { text } = await collect(value);
      assert.equal(text, JSON.stringify(value));
    });
  }

  it('emits a large export as many bounded chunks rather than one string', async function () {
    const posts = Array.from({ length: 5000 }, (_, i) => ({
      id: String(i),
      title: `Post ${i}`,
      html: 'x'.repeat(200),
    }));
    const value = { db: [{ meta: { version: '6.0.0' }, data: { posts } }] };

    const { text, chunks } = await collect(value);

    assert.equal(text, JSON.stringify(value));
    assert.ok(chunks.length > 10, `expected many chunks, got ${chunks.length}`);
    const largestRow = Math.max(...posts.map((post) => JSON.stringify(post).length));
    for (const chunk of chunks) {
      assert.ok(chunk.length < 64 * 1024 + largestRow + 64, `chunk of ${chunk.length} chars`);
    }
  });

  it('emits a stream error for a circular structure', async function () {
    const value: { data: { rows: unknown[] } } = { data: { rows: [] } };
    value.data.rows.push(value.data);

    await assert.rejects(collect(value), /circular/);
  });

  it('emits a stream error for an unserializable value', async function () {
    await assert.rejects(collect({ rows: [{ count: 1n }] }), TypeError);
  });
});
