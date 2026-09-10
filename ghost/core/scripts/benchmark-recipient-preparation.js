// Synthetic preparation benchmark. Creates and drops its own database on local MySQL.
// Run from ghost/core with NODE_OPTIONS=--conditions=source and --expose-gc.
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'package.json'));
req('tsx/cjs');
const size = Number(process.argv[2] || 500000);
const concurrency = Number(process.argv[3] || 2);
if (
  !Number.isSafeInteger(size) ||
  size < 1 ||
  !Number.isSafeInteger(concurrency) ||
  concurrency < 1
) {
  throw new (req('@tryghost/errors').IncorrectUsageError)({
    message:
      'Usage: node --expose-gc scripts/benchmark-recipient-preparation.js [members=500000] [concurrency=2]',
  });
}
const database = `ghost_preparation_bench_${process.pid}_${crypto.randomBytes(3).toString('hex')}`;
process.env.NODE_ENV = 'testing-mysql';
process.env.database__client = 'mysql2';
process.env.database__connection__host = '127.0.0.1';
process.env.database__connection__port = '3306';
process.env.database__connection__user ||= 'root';
process.env.database__connection__password ||= '';
process.env.database__connection__database = database;
process.env.database__pool__min = '0';
process.env.database__pool__max = '5';
process.env.logging__level = 'error';
const knexFactory = req('knex');
const admin = knexFactory({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    user: process.env.database__connection__user,
    password: process.env.database__connection__password,
  },
  pool: { min: 0, max: 1 },
});
let db;
let created = false;
const started = Date.now();
const print = (data) => process.stdout.write(JSON.stringify(data) + '\n');
async function main() {
  await admin.raw('CREATE DATABASE ??', [database]);
  created = true;
  const [server] = await admin.raw(
    'SELECT VERSION() AS version, @@innodb_buffer_pool_size AS buffer_pool_bytes, @@innodb_flush_log_at_trx_commit AS flush_log_at_commit, @@transaction_isolation AS isolation',
  );
  print({ phase: 'database', ...server[0] });
  req('./core/server/overrides');
  const KnexMigrator = req('knex-migrator');
  const migrator = new KnexMigrator({ knexMigratorFilePath: root });
  await migrator.init();
  db = req('./core/server/data/db');
  const models = req('./core/server/models');
  const BatchSendingService = req('./core/server/services/email-service/batch-sending-service');
  const ObjectID = req('bson-objectid').default;
  const logging = req('@tryghost/logging');
  let metrics = {};
  let measureStart = 0;
  logging.info = (event) => {
    if (event?.event?.name === 'email.preparation.discarded') {
      metrics.discard_ms = Date.now() - measureStart;
    }
    if (event?.event?.name === 'email.preparation.swept') {
      metrics.sweep_ms = event.duration_ms;
    }
    if (event?.event?.name === 'email.batches.created') {
      metrics.batches = event.batches_total;
    }
  };
  logging.warn = () => {};
  const newsletter = await db.knex('newsletters').first();
  const labelId = ObjectID().toHexString();
  await db.knex('labels').insert({
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
    await db.knex('members').insert(members);
    await db.knex('members_newsletters').insert(
      members.map((m) => ({
        id: ObjectID().toHexString(),
        member_id: m.id,
        newsletter_id: newsletter.id,
      })),
    );
    const labelled = members.filter((_, i) => (offset + i) % 5 === 0);
    await db
      .knex('members_labels')
      .insert(
        labelled.map((m) => ({ id: ObjectID().toHexString(), member_id: m.id, label_id: labelId })),
      );
    if ((offset + 1000) % 100000 === 0) {
      print({ phase: 'seed', members: offset + 1000, elapsed_ms: Date.now() - started });
    }
  }
  const segmenter = new (req('./core/server/services/email-service/email-segmenter'))({});
  const service = new BatchSendingService({
    db,
    models,
    batchCreationConcurrency: concurrency,
    emailRenderer: { getSegments: async () => ['status:free', 'status:-free'] },
    emailSegmenter: segmenter,
    domainWarmingService: { isEnabled: () => false },
    sendingService: { getMaximumRecipients: () => 1000 },
    BEFORE_RETRY_CONFIG: { maxRetries: 0 },
  });
  let queries = 0;
  db.knex.on('query', () => {
    queries += 1;
  });
  async function measure(email, phase) {
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
      await db
        .knex('emails')
        .where({ id: email.id })
        .update({ prepared_at: null, candidate_count: null, preparation_excluded_count: null });
      await email.refresh();
      await measure(email, 'discard-and-rebuild:all');
    }
  }
}
main()
  .catch((error) => {
    print({ error: error.stack });
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
