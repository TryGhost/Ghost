#!/usr/bin/env node
// Synthetic preparation benchmark. Creates and drops its own database on local MySQL.
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import knexModule from 'knex';

const knexFactory = knexModule.default;

const root = fileURLToPath(new URL('../../ghost', import.meta.url));
const usage = 'Usage: pnpm gx benchmark recipient-preparation [members=500000] [concurrency=2]';
if (['--help', '-h'].includes(process.argv[2] ?? '')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
const size = Number(process.argv[2] || 500000);
const concurrency = Number(process.argv[3] || 2);
if (
  !Number.isSafeInteger(size) ||
  size < 1 ||
  !Number.isSafeInteger(concurrency) ||
  concurrency < 1
) {
  throw new errors.IncorrectUsageError({ message: usage });
}
const database = `ghost_preparation_bench_${process.pid}_${crypto.randomBytes(3).toString('hex')}`;
process.env.NODE_ENV = 'testing-mysql';
process.env.database__client = 'mysql2';
process.env.database__connection__host ||= '127.0.0.1';
process.env.database__connection__port ||= '3306';
process.env.database__connection__user ||= 'root';
process.env.database__connection__password ??= 'root';
process.env.database__connection__database = database;
process.env.database__pool__min = '0';
process.env.database__pool__max = '5';
process.env.logging__level = 'error';
const admin = knexFactory({
  client: 'mysql2',
  connection: {
    host: process.env.database__connection__host,
    port: Number(process.env.database__connection__port),
    user: process.env.database__connection__user,
    password: process.env.database__connection__password,
  },
  pool: { min: 0, max: 1 },
});
let db: typeof import('../../ghost/core/server/data/db/index.js') | undefined;
let created = false;
const started = Date.now();
const print = (data: unknown) => process.stdout.write(JSON.stringify(data) + '\n');
async function main() {
  await admin.raw('CREATE DATABASE ??', [database]);
  created = true;
  const [server] = await admin.raw(
    'SELECT VERSION() AS version, @@innodb_buffer_pool_size AS buffer_pool_bytes, @@innodb_flush_log_at_trx_commit AS flush_log_at_commit, @@transaction_isolation AS isolation',
  );
  print({ phase: 'database', ...server[0] });
  // @ts-expect-error Core's JavaScript overrides have no type declarations.
  await import('../../ghost/core/server/overrides.js');
  const { default: KnexMigrator } = await import('knex-migrator');
  const migrator = new KnexMigrator({ knexMigratorFilePath: root });
  await migrator.init();
  const { default: coreDb } = await import('../../ghost/core/server/data/db/index.js');
  db = coreDb;
  const knex = coreDb.knex;
  // @ts-expect-error Core's JavaScript models have no type declarations.
  const { default: models } = await import('../../ghost/core/server/models/index.js');
  const { default: BatchSendingService } =
    // @ts-expect-error This JavaScript service has no type declarations.
    await import('../../ghost/core/server/services/email-service/batch-sending-service.js');
  const { default: bsonObjectId } = await import('bson-objectid');
  const ObjectID = bsonObjectId.default;
  const { default: logging } = await import('@tryghost/logging');
  type Metrics = {
    discard_ms?: number;
    sweep_ms?: number;
    batches?: number;
    member_lookup_ms?: number;
    member_lookup_queries?: number;
    member_lookup_rows?: number;
  };
  let metrics: Metrics = {};
  let measureStart = 0;
  logging.info = (event: unknown) => {
    if (!event || typeof event !== 'object' || !('event' in event)) {
      return;
    }
    const detail = event.event;
    if (!detail || typeof detail !== 'object' || !('name' in detail)) {
      return;
    }
    if (detail.name === 'email.preparation.discarded') {
      metrics.discard_ms = Date.now() - measureStart;
    }
    if (
      detail.name === 'email.preparation.swept' &&
      'duration_ms' in event &&
      typeof event.duration_ms === 'number'
    ) {
      metrics.sweep_ms = event.duration_ms;
    }
    if (
      detail.name === 'email.batches.created' &&
      'batches_total' in event &&
      typeof event.batches_total === 'number'
    ) {
      metrics.batches = event.batches_total;
    }
  };
  logging.warn = () => {};
  const newsletter = await knex('newsletters').first();
  const labelId = ObjectID().toHexString();
  await knex('labels').insert({
    id: labelId,
    name: 'benchmark-label',
    slug: 'benchmark-label',
    created_at: new Date(),
  });
  for (let offset = 0; offset < size; offset += 1000) {
    const members = Array.from({ length: Math.min(1000, size - offset) }, (_, i) => ({
      id: (offset + i + 1).toString(16).padStart(24, '0'),
      uuid: crypto.randomUUID(),
      transient_id: crypto.randomUUID(),
      email: `member-${offset + i + 1}@example.com`,
      name: 'Benchmark Member',
      status: (offset + i) % 2 === 0 ? 'free' : 'paid',
      created_at: new Date(),
      updated_at: new Date(),
    }));
    await knex('members').insert(members);
    await knex('members_newsletters').insert(
      members.map((m) => ({
        id: ObjectID().toHexString(),
        member_id: m.id,
        newsletter_id: newsletter.id,
      })),
    );
    const labelled = members.filter((_, i) => (offset + i) % 5 === 0);
    await knex('members_labels').insert(
      labelled.map((m) => ({ id: ObjectID().toHexString(), member_id: m.id, label_id: labelId })),
    );
    if ((offset + 1000) % 100000 === 0) {
      print({ phase: 'seed', members: offset + 1000, elapsed_ms: Date.now() - started });
    }
  }
  const { default: EmailSegmenter } =
    // @ts-expect-error This JavaScript service has no type declarations.
    await import('../../ghost/core/server/services/email-service/email-segmenter.js');
  const segmenter = new EmailSegmenter({});
  const service = new BatchSendingService({
    db: coreDb,
    models,
    batchCreationConcurrency: concurrency,
    emailRenderer: { getSegments: async () => ['status:free', 'status:-free'] },
    emailSegmenter: segmenter,
    domainWarmingService: { isEnabled: () => false },
    sendingService: { getMaximumRecipients: () => 1000 },
    BEFORE_RETRY_CONFIG: { maxRetries: 0 },
  });
  let queries = 0;
  type Query = { sql: string; __knexQueryUid: string };
  const memberLookupStarts = new Map<string, number>();
  knex.on('query', (query: Query) => {
    queries += 1;
    if (query.sql.includes('`uuid`') && query.sql.includes('from `members`')) {
      memberLookupStarts.set(query.__knexQueryUid, performance.now());
    }
  });
  knex.on('query-response', (rows: unknown[], query: Query) => {
    const startedAt = memberLookupStarts.get(query.__knexQueryUid);
    if (startedAt !== undefined) {
      metrics.member_lookup_ms = (metrics.member_lookup_ms ?? 0) + performance.now() - startedAt;
      metrics.member_lookup_queries = (metrics.member_lookup_queries ?? 0) + 1;
      metrics.member_lookup_rows = (metrics.member_lookup_rows ?? 0) + rows.length;
      memberLookupStarts.delete(query.__knexQueryUid);
    }
  });
  async function measure(email: { id: string; get: (key: string) => unknown }, phase: string) {
    global.gc?.();
    const baseline = process.memoryUsage();
    let peakRss = baseline.rss;
    let peakHeap = baseline.heapUsed;
    const sample = () => {
      const m = process.memoryUsage();
      peakRss = Math.max(peakRss, m.rss);
      peakHeap = Math.max(peakHeap, m.heapUsed);
    };
    const timer = setInterval(sample, 10);
    metrics = {};
    queries = 0;
    measureStart = Date.now();
    try {
      const batches = await service.createBatches({
        email,
        post: {},
        newsletter: { id: newsletter.id, get: () => 'members' },
      });
      sample();
      global.gc?.();
      print({
        phase,
        size,
        concurrency,
        pool_max: 5,
        duration_ms: Date.now() - measureStart,
        ...metrics,
        candidates: email.get('candidate_count'),
        prepared: email.get('email_count'),
        queries,
        baseline_rss: baseline.rss,
        peak_rss: peakRss,
        rss_growth: peakRss - baseline.rss,
        heap_growth: peakHeap - baseline.heapUsed,
        retained_heap_growth: process.memoryUsage().heapUsed - baseline.heapUsed,
      });
      return batches;
    } finally {
      clearInterval(timer);
    }
  }
  for (const filter of ['all', 'label:benchmark-label']) {
    const email = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: filter === 'all' ? size : Math.ceil(size / 5),
      preflight_email_count: filter === 'all' ? size : Math.ceil(size / 5),
      recipient_filter: filter,
    });
    await measure(email, `prepare:${filter}`);
    if (filter === 'all') {
      // Model a crash after every pending batch committed but before the preparation marker.
      await knex('emails')
        .where({ id: email.id })
        .update({ prepared_at: null, candidate_count: null, preparation_excluded_count: null });
      await email.refresh();
      await measure(email, 'discard-and-rebuild:all');
    }
  }
}
main()
  .catch((error: unknown) => {
    print({ error: error instanceof Error ? error.stack : String(error) });
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) {
      await db.knex.destroy();
    }
    if (created) {
      await admin.raw('DROP DATABASE IF EXISTS ??', [database]);
    }
    await admin.destroy();
    // Ghost's fixture/migration helpers may own auxiliary pools; the owned DB is gone.
    process.exit(process.exitCode || 0);
  });
