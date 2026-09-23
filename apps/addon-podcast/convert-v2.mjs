/** Offline development-content conversion. Does not modify schemas or migration history. */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

// This workspace-only helper deliberately uses Core's database and rendering runtime.
const requireCore = createRequire(new URL('../../ghost/core/package.json', import.meta.url));

function episodeProps(rows) {
  const fields = new Map();
  for (const row of rows) {
    if (row.path !== '' || fields.has(row.key)) throw Error(`Invalid metadata: ${row.key}`);
    let value = row.value_text;
    if (value === null || value === '') value = null;
    else if (row.type === 'boolean') {
      if (!['true', 'false'].includes(value)) throw Error(`Invalid boolean: ${row.key}`);
      value = value === 'true';
    } else if (row.type === 'integer') {
      value = Number(value);
      if (!Number.isSafeInteger(value) || value < 0) throw Error(`Invalid integer: ${row.key}`);
    } else if (!['short_text', 'url'].includes(row.type))
      throw Error(`Unknown field type: ${row.key}`);
    fields.set(row.key, value);
  }
  const props = {
    version: 1,
    show_id: fields.get('show_id') ?? null,
    title: null,
    episode_number: fields.get('episode_number') ?? null,
    season_number: fields.get('season_number') ?? null,
    offer_free: fields.get('offer_free') ?? null,
  };
  for (const slot of ['full_audio', 'free_audio', 'full_video', 'free_video']) {
    const url = fields.get(`${slot}_url`) ?? null;
    const mime_type = fields.get(`${slot}_mime`) ?? null;
    const byte_length = fields.get(`${slot}_bytes`) ?? null;
    props[slot] = [url, mime_type, byte_length].every((value) => value === null)
      ? null
      : { url, mime_type, byte_length };
  }
  return props;
}

function convertedDocument(post, props) {
  if (post.type !== 'post') throw Error(`Expected ordinary base post: ${post.id}`);
  const source =
    post.lexical ||
    (post.mobiledoc
      ? requireCore('@tryghost/kg-converters').mobiledocToLexical(post.mobiledoc)
      : JSON.stringify({
          root: { type: 'root', version: 1, children: [], direction: null, format: '', indent: 0 },
        }));
  const document = JSON.parse(source);
  if (document?.root?.type !== 'root' || !Array.isArray(document.root.children))
    throw Error(`Invalid body: ${post.id}`);
  const cardId = `podcast-v2-${post.uuid}`;
  const visit = (node) => {
    if (node?.type === 'addon' && node.id === cardId)
      throw Error(`Existing conversion card ID: ${post.id}`);
    if (Array.isArray(node?.children)) node.children.forEach(visit);
  };
  visit(document.root);
  const card = {
    type: 'addon',
    version: 1,
    id: cardId,
    addonHandle: 'podcast',
    blockName: 'episode',
    label: 'Podcast episode',
    props,
    publicProps: {},
    html: '<p>Podcast episode</p>',
    css: '',
    portableHtml: '<p><a data-ghost-post-link>Listen to this episode on the website</a></p>',
    hydrate: true,
    initialHeight: 160,
    resourceOrigins: [],
    resourcePolicy: { images: ['https:'], media: ['https:', 'http:'] },
  };
  document.root.children.unshift(card);
  return { cardId, card, lexical: JSON.stringify(document) };
}

export async function convertDatabase(db, { apply = false, backup } = {}) {
  if (apply && typeof backup !== 'function')
    throw Error('Applying conversion requires a backup destination.');
  if (!(await db.schema.hasColumn('posts', 'content_type'))) return [];
  if (
    !(await db.schema.hasTable('posts_metafields')) ||
    !(await db.schema.hasTable('posts_metafield_values'))
  )
    throw Error('V2 metadata tables are missing.');
  return db.transaction(async (trx) => {
    const posts = await trx('posts')
      .where({ content_type: 'podcast.episode' })
      .orderBy('id')
      .forUpdate();
    if (!posts.length) return [];
    const changes = [];
    const metadata = [];
    const { LexicalHTMLRenderer } = requireCore('@tryghost/kg-lexical-html-renderer');
    const { DEFAULT_NODES } = requireCore('@tryghost/kg-default-nodes');
    const renderer = new LexicalHTMLRenderer({
      nodes: DEFAULT_NODES,
      onError: (error) => {
        throw error;
      },
    });
    for (const post of posts) {
      const rows = await trx('posts_metafield_values as value')
        .join('posts_metafields as field', 'field.id', 'value.metafield_id')
        .where({ 'value.post_id': post.id, 'field.namespace': 'podcast' })
        .select('value.*', 'field.key', 'field.type');
      metadata.push(...rows);
      const converted = convertedDocument(post, episodeProps(rows));
      // Existing stored HTML already contains Ghost's body-gating markers. Keep
      // it byte-for-byte; the V2 automatic prepend was never stored in the body.
      const html = await renderer.render(
        JSON.stringify({
          root: {
            type: 'root',
            version: 1,
            children: [converted.card],
            direction: null,
            format: '',
            indent: 0,
          },
        }),
      );
      const patch = {
        content_type: null,
        lexical: converted.lexical,
        mobiledoc: null,
        html: !post.html ? await renderer.render(converted.lexical) : html + (post.html || ''),
      };
      patch.plaintext = requireCore('@tryghost/html-to-plaintext').excerpt(patch.html);
      changes.push({
        id: post.id,
        cardId: converted.cardId,
        patch,
        status: post.status,
        visibility: post.visibility,
      });
    }
    if (apply) {
      await backup({ version: 1, posts, metadata });
      for (const change of changes)
        await trx('posts').where({ id: change.id }).update(change.patch);
    }
    return changes.map(({ patch, ...report }) => report);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      'database-config': { type: 'string' },
      apply: { type: 'boolean', default: false },
      backup: { type: 'string' },
    },
  });
  if (!values['database-config'])
    throw Error(
      'Pass --database-config /absolute/path/to/knex-config.json. Stop Ghost before applying.',
    );
  if (values.apply && !values.backup)
    throw Error('Pass --backup /absolute/path/to/new-backup.json with --apply.');
  const config = JSON.parse(await readFile(values['database-config'], 'utf8'));
  if (!['mysql2', 'better-sqlite3'].includes(config.client) || !config.connection)
    throw Error('Expected a MySQL or SQLite Knex configuration.');
  const db = requireCore('knex')(config);
  try {
    const result = await convertDatabase(db, {
      apply: values.apply,
      backup: values.backup
        ? (data) =>
            writeFile(values.backup, JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 })
        : undefined,
    });
    console.log(JSON.stringify({ applied: values.apply, posts: result }, null, 2));
    console.log(
      'Source metadata and migration history retained. Players now follow body gating; no preview divider or access rule was changed.',
    );
  } finally {
    await db.destroy();
  }
}
