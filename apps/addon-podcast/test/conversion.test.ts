import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import { convertDatabase } from '../convert-v2.mjs';

const requireCore = createRequire(new URL('../../../ghost/core/package.json', import.meta.url));
const knex = requireCore('knex');
type Table = { string: (name: string) => { primary: () => void }; text: (name: string) => void };
const body = JSON.stringify({
  root: {
    type: 'root',
    version: 1,
    children: [
      { type: 'paywall', version: 1 },
      { type: 'paragraph', version: 1, children: [] },
    ],
  },
});
async function fixture() {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('posts', (t: Table) => {
    t.string('id').primary();
    for (const column of [
      'uuid',
      'title',
      'slug',
      'type',
      'status',
      'visibility',
      'published_at',
      'updated_at',
      'content_type',
      'lexical',
      'html',
      'plaintext',
      'mobiledoc',
    ]) {
      t.text(column);
    }
  });
  await db.schema.createTable('posts_metafields', (t: Table) => {
    t.string('id').primary();
    t.string('namespace');
    t.string('key');
    t.string('type');
  });
  await db.schema.createTable('posts_metafield_values', (t: Table) => {
    t.string('id').primary();
    t.string('post_id');
    t.string('metafield_id');
    t.string('path');
    t.text('value_text');
  });
  await db('posts').insert({
    id: 'post',
    uuid: 'post-uuid',
    title: 'Original',
    slug: 'unchanged',
    type: 'post',
    status: 'scheduled',
    visibility: 'paid',
    published_at: '2030-01-01',
    updated_at: '2026-01-01',
    content_type: 'podcast.episode',
    lexical: body,
    html: '<!--members-only--><p>Original body</p>',
    plaintext: 'Original body',
  });
  const fields = [
    ['show_id', 'short_text', 'show'],
    ['offer_free', 'boolean', 'true'],
    ['full_audio_url', 'url', 'https://storage.test/full.mp3'],
    ['full_audio_mime', 'short_text', 'audio/mpeg'],
    ['full_audio_bytes', 'integer', '12'],
  ];
  for (const [key, type, value] of fields) {
    await db('posts_metafields').insert({ id: key, namespace: 'podcast', key, type });
    await db('posts_metafield_values').insert({
      id: key,
      post_id: 'post',
      metafield_id: key,
      path: '',
      value_text: value,
    });
  }
  return db;
}

it('dry-runs then atomically converts in place, retaining metadata and stable publication fields', async () => {
  const db = await fixture();
  try {
    const before = await db('posts').first();
    const originalMetadata = await db('posts_metafield_values');
    const report = await convertDatabase(db);
    expect(report[0]).toMatchObject({ id: 'post', cardId: 'podcast-v2-post-uuid' });
    expect(await db('posts').first()).toEqual(before);
    const backups: unknown[] = [];
    await convertDatabase(db, {
      apply: true,
      backup: async (data: unknown) => {
        backups.push(data);
      },
    });
    const after = await db('posts').first();
    for (const key of [
      'id',
      'uuid',
      'title',
      'slug',
      'status',
      'visibility',
      'published_at',
      'updated_at',
      'type',
    ]) {
      expect(after[key]).toEqual(before[key]);
    }
    expect(after.content_type).toBeNull();
    expect(after.html).toContain('<p>Original body</p>');
    expect(after.html).not.toContain('storage.test');
    const children = JSON.parse(after.lexical).root.children;
    expect(children.slice(1)).toEqual(JSON.parse(body).root.children);
    expect(children[0]).toMatchObject({
      id: 'podcast-v2-post-uuid',
      type: 'addon',
      addonHandle: 'podcast',
      blockName: 'episode',
      publicProps: {},
      props: {
        version: 1,
        show_id: 'show',
        offer_free: true,
        title: null,
        full_audio: {
          url: 'https://storage.test/full.mp3',
          mime_type: 'audio/mpeg',
          byte_length: 12,
        },
      },
    });
    expect(backups).toMatchObject([{ posts: [before] }]);
    expect(await db('posts_metafield_values')).toEqual(originalMetadata);
    expect(
      await convertDatabase(db, {
        apply: true,
        backup: async () => {
          throw Error('No backup needed');
        },
      }),
    ).toEqual([]);
  } finally {
    await db.destroy();
  }
});

it('leaves every post unchanged if a later post is invalid or the backup fails', async () => {
  const db = await fixture();
  try {
    const before = await db('posts').first();
    await expect(
      convertDatabase(db, {
        apply: true,
        backup: async () => {
          throw Error('disk full');
        },
      }),
    ).rejects.toThrow('disk full');
    expect(await db('posts').first()).toEqual(before);
    await db('posts').insert({ ...before, id: 'later', uuid: 'later', lexical: 'invalid' });
    const rows = await db('posts').orderBy('id');
    await expect(convertDatabase(db, { apply: true, backup: async () => {} })).rejects.toThrow();
    expect(await db('posts').orderBy('id')).toEqual(rows);
  } finally {
    await db.destroy();
  }
});

it('refuses duplicate generated card IDs, invalid scalar metadata and apply without a backup', async () => {
  const db = await fixture();
  try {
    await expect(convertDatabase(db, { apply: true })).rejects.toThrow('backup');
    await db('posts_metafield_values').where({ id: 'offer_free' }).update({ value_text: 'yes' });
    await expect(convertDatabase(db)).rejects.toThrow('offer_free');
    await db('posts_metafield_values').where({ id: 'offer_free' }).update({ value_text: 'true' });
    await db('posts').update({
      lexical: JSON.stringify({
        root: {
          type: 'root',
          version: 1,
          children: [{ type: 'addon', id: 'podcast-v2-post-uuid' }],
        },
      }),
    });
    await expect(convertDatabase(db)).rejects.toThrow('card ID');
  } finally {
    await db.destroy();
  }
});

it.each([null, ''])(
  'renders a draft body with missing HTML (%s) without losing its content',
  async (html) => {
    const db = await fixture();
    try {
      const lexical = JSON.stringify({
        root: {
          type: 'root',
          version: 1,
          children: [
            {
              type: 'paragraph',
              version: 1,
              children: [
                {
                  type: 'text',
                  version: 1,
                  text: 'Unrendered draft',
                  format: 0,
                  detail: 0,
                  mode: 'normal',
                  style: '',
                },
              ],
            },
          ],
        },
      });
      await db('posts').update({ html, plaintext: null, lexical, status: 'draft' });
      await convertDatabase(db, { apply: true, backup: async () => {} });
      const post = await db('posts').first();
      expect(post.html).toContain('Unrendered draft');
      expect(post.plaintext).toContain('Unrendered draft');
      expect(post.status).toBe('draft');
    } finally {
      await db.destroy();
    }
  },
);
