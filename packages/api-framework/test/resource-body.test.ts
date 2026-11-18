import assert from 'node:assert/strict';
import { z } from 'zod';
import { resourceBody } from '../src/index.ts';

describe('resourceBody', function () {
  const label = z.object({ name: z.string().trim(), color: z.string().optional() });
  const body = resourceBody('labels', label);

  it('parses to the resource, with its transforms applied', function () {
    const parsed: { name: string; color?: string } = body.parse({ labels: [{ name: ' News ' }] });

    assert.deepEqual(parsed, { name: 'News' });
  });

  it('keeps the body as sent as its input type', function () {
    const input: z.input<typeof body> = { labels: [{ name: 'News' }] };

    assert.deepEqual(body.parse(input), { name: 'News' });
  });

  it('reports issues at their path in the body as sent', function () {
    const result = body.safeParse({ labels: [{ name: 42 }] });

    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues[0]?.path, ['labels', 0, 'name']);
  });

  it('rejects an empty array even when the resource has a default', function () {
    const withDefault = resourceBody('labels', label.default({ name: 'News' }));

    assert.equal(withDefault.safeParse({ labels: [] }).success, false);
    assert.deepEqual(withDefault.parse({ labels: [{ name: 'Sport' }] }), { name: 'Sport' });
  });

  for (const [name, input] of [
    ['a missing root key', {}],
    ['another root key', { tags: [{ name: 'News' }] }],
    ['an empty array', { labels: [] }],
    ['more than one resource', { labels: [{ name: 'News' }, { name: 'Sport' }] }],
    ['a resource outside an array', { labels: { name: 'News' } }],
    ['no body', undefined],
  ] as const) {
    it(`rejects ${name}`, function () {
      assert.equal(body.safeParse(input).success, false);
    });
  }
});
