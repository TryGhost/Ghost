const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const inspector = require('node:inspector');
const os = require('node:os');
const path = require('node:path');
const { monitorEventLoopDelay, performance } = require('node:perf_hooks');

const ObjectId = require('bson-objectid').default;
const DomainEvents = require('@tryghost/domain-events');
const moment = require('moment-timezone');
const sinon = require('sinon');

const { agentProvider, configUtils, fixtureManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const emailAnalytics = require('../../../../core/server/services/email-analytics');
const EmailEventProcessor = require('../../../../core/server/services/email-service/email-event-processor');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const LastSeenAtUpdater = require('../../../../core/server/services/members-events/last-seen-at-updater');
const MailgunClient = require('../../../../core/server/services/lib/mailgun-client');
const { Queries } = require('../../../../core/server/services/email-analytics/lib/queries');
const {
  EventProcessingResult,
} = require('../../../../core/server/services/email-analytics/event-processing-result');

const BENCHMARK_ENABLED = process.env.EMAIL_ANALYTICS_BENCHMARK === '1';
const SCENARIO = process.env.EMAIL_ANALYTICS_BENCHMARK_SCENARIO || 'current';
const UNIQUE_RECIPIENTS = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_RECIPIENTS || 5001);
const ACTIVE_SEND_RECIPIENTS = Number(
  process.env.EMAIL_ANALYTICS_BENCHMARK_SEND_RECIPIENTS || UNIQUE_RECIPIENTS,
);
const DUPLICATE_RATE = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_DUPLICATE_RATE || 0.31);
const PAGE_SIZE = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_PAGE_SIZE || 300);
const PAGE_SIZES = (process.env.EMAIL_ANALYTICS_BENCHMARK_PAGE_SIZES || String(PAGE_SIZE))
  .split(',')
  .map((value) => Number(value.trim()));
const WRITE_BUFFER_SIZE_MATRIX_ENABLED = Boolean(
  process.env.EMAIL_ANALYTICS_BENCHMARK_WRITE_BUFFER_SIZES,
);
const FETCH_PAGE_SIZE = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_FETCH_PAGE_SIZE || PAGE_SIZE);
const WRITE_BUFFER_SIZES = (
  process.env.EMAIL_ANALYTICS_BENCHMARK_WRITE_BUFFER_SIZES || String(FETCH_PAGE_SIZE)
)
  .split(',')
  .map((value) => Number(value.trim()));
const WRITE_SHAPE_MATRIX_ENABLED = Boolean(process.env.EMAIL_ANALYTICS_BENCHMARK_WRITE_SHAPES);
const WRITE_SHAPES = (process.env.EMAIL_ANALYTICS_BENCHMARK_WRITE_SHAPES || 'native-case')
  .split(',')
  .map((value) => value.trim());
const PAGE_LATENCY_MS = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_PAGE_LATENCY_MS || 0);
const HISTORY_RECIPIENTS_PER_MEMBER = Number(
  process.env.EMAIL_ANALYTICS_BENCHMARK_HISTORY_PER_MEMBER || 0,
);
const HISTORY_OPEN_RATE = Number(process.env.EMAIL_ANALYTICS_BENCHMARK_HISTORY_OPEN_RATE || 0.48);
const PROFILE_DIR =
  process.env.EMAIL_ANALYTICS_BENCHMARK_OUTPUT ||
  path.join(os.tmpdir(), 'ghost-email-analytics-benchmark');

function inspectorPost(session, method, params = {}) {
  return new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

async function startCpuProfile() {
  const session = new inspector.Session();
  session.connect();
  await inspectorPost(session, 'Profiler.enable');
  await inspectorPost(session, 'Profiler.setSamplingInterval', { interval: 1000 });
  await inspectorPost(session, 'Profiler.start');
  return session;
}

async function stopCpuProfile(session) {
  const { profile } = await inspectorPost(session, 'Profiler.stop');
  session.disconnect();
  return profile;
}

function summarizeCpuProfile(profile, limit = 25) {
  const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));
  const selfTimeByFrame = new Map();
  let sampledMicros = 0;

  for (let index = 0; index < profile.samples.length; index += 1) {
    const node = nodesById.get(profile.samples[index]);
    const timeDelta = profile.timeDeltas[index] || 0;
    if (!node) {
      continue;
    }

    const { functionName, url, lineNumber } = node.callFrame;
    const key = `${functionName || '(anonymous)'}\t${url || '(native)'}\t${lineNumber + 1}`;
    selfTimeByFrame.set(key, (selfTimeByFrame.get(key) || 0) + timeDelta);
    sampledMicros += timeDelta;
  }

  const rawFrames = Array.from(selfTimeByFrame.entries()).map(([key, selfMicros]) => {
    const [functionName, url, line] = key.split('\t');
    return {
      functionName,
      url,
      line: Number(line),
      selfMicros,
    };
  });
  const profilerOverheadMicros = rawFrames
    .filter(({ url }) => url === 'node:inspector')
    .reduce((total, { selfMicros }) => total + selfMicros, 0);
  const workloadSampledMicros = sampledMicros - profilerOverheadMicros;
  const frames = rawFrames
    .filter(({ url }) => url !== 'node:inspector')
    .map(({ functionName, url, line, selfMicros }) => {
      return {
        functionName,
        url,
        line,
        selfMs: Number((selfMicros / 1000).toFixed(1)),
        selfPercent: Number(((selfMicros / workloadSampledMicros) * 100).toFixed(1)),
      };
    })
    .sort((left, right) => right.selfMs - left.selfMs);

  return {
    sampledMs: Number((workloadSampledMicros / 1000).toFixed(1)),
    profilerOverheadMs: Number((profilerOverheadMicros / 1000).toFixed(1)),
    topSelfTime: frames.slice(0, limit),
    topGhostSelfTime: frames
      .filter(({ url }) => url.includes('/ghost/core/core/server/'))
      .slice(0, limit),
  };
}

function classifySql(sql) {
  const normalized = sql.replaceAll('`', '').replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalized.includes('email_analytics_benchmark_open_updates')) {
    if (normalized.startsWith('update email_recipients')) {
      return 'recipient opened update';
    }
    return 'recipient update staging';
  }
  if (normalized.startsWith('update members set last_seen_at')) {
    return 'member last_seen update';
  }
  if (normalized.startsWith('update members set email_opened_count')) {
    return 'member opened counter update';
  }
  if (normalized.startsWith('update members set email_count')) {
    return 'member aggregate update';
  }
  if (
    normalized.startsWith('select id, member_id, email_id from email_recipients') &&
    normalized.includes('opened_at is null')
  ) {
    return 'recipient transition preselect';
  }
  if (
    normalized.startsWith('select email_recipients.member_id') &&
    normalized.includes('group by email_recipients.member_id')
  ) {
    return 'member aggregate scan';
  }
  if (normalized.startsWith('update email_recipients') && normalized.includes('opened_at')) {
    return 'recipient opened update';
  }
  if (normalized.startsWith('select id, member_id, email_id, member_email from email_recipients')) {
    return 'recipient batch lookup';
  }
  if (normalized.includes('count(id) as count from email_recipients')) {
    return 'email aggregate scan';
  }
  if (normalized.startsWith('update emails set') && normalized.includes('opened_count')) {
    return 'email opened counter update';
  }
  if (normalized.startsWith('update emails set')) {
    return 'email aggregate update';
  }
  if (normalized.includes(' jobs ')) {
    return 'job cursor';
  }
  return 'other';
}

function instrumentDatabase(knex) {
  const started = new Map();
  const stats = new Map();

  const onQuery = (query) => {
    started.set(query.__knexQueryUid, {
      category: classifySql(query.sql),
      startedAt: performance.now(),
    });
  };
  const onResponse = (_response, query) => {
    const pending = started.get(query.__knexQueryUid);
    if (!pending) {
      return;
    }
    const current = stats.get(pending.category) || { count: 0, elapsedMs: 0 };
    current.count += 1;
    current.elapsedMs += performance.now() - pending.startedAt;
    stats.set(pending.category, current);
    started.delete(query.__knexQueryUid);
  };
  const onError = (_error, query) => onResponse(null, query);

  knex.on('query', onQuery);
  knex.on('query-response', onResponse);
  knex.on('query-error', onError);

  return {
    stop() {
      knex.off('query', onQuery);
      knex.off('query-response', onResponse);
      knex.off('query-error', onError);

      return Object.fromEntries(
        Array.from(stats.entries())
          .sort((left, right) => right[1].elapsedMs - left[1].elapsedMs)
          .map(([category, value]) => [
            category,
            {
              count: value.count,
              elapsedMs: Number(value.elapsedMs.toFixed(1)),
            },
          ]),
      );
    },
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function buildEvents({ recipients, emailId, providerId }) {
  const totalEvents = Math.ceil(UNIQUE_RECIPIENTS / (1 - DUPLICATE_RATE));
  const duplicateEvents = totalEvents - UNIQUE_RECIPIENTS;
  const openedAt = Date.now() - 10 * 60 * 1000;
  const eventRecipients = [
    ...recipients,
    ...Array.from({ length: duplicateEvents }, (_, index) => recipients[index % recipients.length]),
  ];

  return eventRecipients.map((recipient, index) => ({
    event: 'opened',
    recipient: recipient.member_email,
    'user-variables': {
      'email-id': emailId,
    },
    message: {
      headers: {
        'message-id': providerId,
      },
    },
    timestamp: (openedAt + index) / 1000,
  }));
}

async function seedRecipients({ emailId, batchId }) {
  const now = new Date();
  const members = [];
  const recipients = [];

  for (let index = 0; index < UNIQUE_RECIPIENTS; index += 1) {
    const memberId = ObjectId().toHexString();
    const memberUuid = crypto.randomUUID();
    const memberEmail = `analytics-benchmark-${index}@example.com`;

    members.push({
      id: memberId,
      uuid: memberUuid,
      transient_id: crypto.randomUUID(),
      email: memberEmail,
      name: `Analytics benchmark ${index}`,
      status: 'free',
      email_disabled: false,
      enable_comment_notifications: true,
      email_count: 0,
      email_opened_count: 0,
      created_at: now,
      updated_at: now,
    });
    recipients.push({
      id: ObjectId().toHexString(),
      email_id: emailId,
      member_id: memberId,
      batch_id: batchId,
      member_uuid: memberUuid,
      member_email: memberEmail,
      member_name: `Analytics benchmark ${index}`,
      processed_at: now,
    });
  }

  await db.knex.batchInsert('members', members, 250);
  await db.knex.batchInsert('email_recipients', recipients, 250);
  return recipients;
}

function syntheticId(prefix, index) {
  return `${prefix}${index.toString(16).padStart(16, '0')}`;
}

function syntheticUuid(index) {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

async function seedUntouchedActiveRecipients({ emailId, batchId, currentRecipientCount }) {
  const untouchedRecipientCount = ACTIVE_SEND_RECIPIENTS - currentRecipientCount;
  assert.ok(
    untouchedRecipientCount >= 0,
    'active send recipient count must include touched and pre-existing fixture recipients',
  );
  if (untouchedRecipientCount === 0) {
    return 0;
  }

  const now = new Date();
  const members = [];
  const recipients = [];

  const flush = async () => {
    if (members.length === 0) {
      return;
    }
    await db.knex.batchInsert('members', members.splice(0), 500);
    await db.knex.batchInsert('email_recipients', recipients.splice(0), 500);
  };

  for (let index = 0; index < untouchedRecipientCount; index += 1) {
    const sequence = UNIQUE_RECIPIENTS + index;
    const memberId = syntheticId('eb000000', sequence);
    const memberUuid = syntheticUuid(sequence);
    const memberEmail = `analytics-benchmark-${sequence}@example.com`;

    members.push({
      id: memberId,
      uuid: memberUuid,
      transient_id: syntheticUuid(sequence + ACTIVE_SEND_RECIPIENTS),
      email: memberEmail,
      name: `Analytics benchmark ${sequence}`,
      status: 'free',
      email_disabled: false,
      enable_comment_notifications: true,
      email_count: 0,
      email_opened_count: 0,
      created_at: now,
      updated_at: now,
    });
    recipients.push({
      id: syntheticId('ec000000', sequence),
      email_id: emailId,
      member_id: memberId,
      batch_id: batchId,
      member_uuid: memberUuid,
      member_email: memberEmail,
      member_name: `Analytics benchmark ${sequence}`,
      processed_at: now,
      delivered_at: now,
    });

    if (members.length >= 5000) {
      await flush();
    }
  }
  await flush();
  return untouchedRecipientCount;
}

function historyRecipientId(index) {
  return `ea000000${index.toString(16).padStart(16, '0')}`;
}

async function seedHistoricalRecipients({ recipients, emailId, batchId }) {
  if (HISTORY_RECIPIENTS_PER_MEMBER === 0) {
    return 0;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const rows = [];
  let rowIndex = 0;

  const flush = async () => {
    if (rows.length === 0) {
      return;
    }
    await db.knex.batchInsert('email_recipients', rows.splice(0), 500);
  };

  for (let historyIndex = 0; historyIndex < HISTORY_RECIPIENTS_PER_MEMBER; historyIndex += 1) {
    const deliveredAt = new Date(now - (historyIndex + 1) * dayMs);
    for (let memberIndex = 0; memberIndex < recipients.length; memberIndex += 1) {
      const recipient = recipients[memberIndex];
      rowIndex += 1;
      const opened = ((memberIndex * 31 + historyIndex) % 100) / 100 < HISTORY_OPEN_RATE;
      rows.push({
        id: historyRecipientId(rowIndex),
        email_id: emailId,
        member_id: recipient.member_id,
        batch_id: batchId,
        member_uuid: recipient.member_uuid,
        member_email: recipient.member_email,
        member_name: recipient.member_name,
        processed_at: deliveredAt,
        delivered_at: deliveredAt,
        opened_at: opened ? deliveredAt : null,
      });

      if (rows.length >= 5000) {
        await flush();
      }
    }
  }
  await flush();
  return rowIndex;
}

async function batchGetRecipientsGroupedByEmail(emailIdentifications) {
  const emailsByEmailId = new Map();
  for (const identification of emailIdentifications) {
    if (!identification.emailId || !identification.email) {
      continue;
    }
    const emails = emailsByEmailId.get(identification.emailId) || new Set();
    emails.add(identification.email);
    emailsByEmailId.set(identification.emailId, emails);
  }

  const recipientCache = new Map();
  if (emailsByEmailId.size === 0) {
    return recipientCache;
  }

  const query = db
    .knex('email_recipients')
    .select('id', 'member_id', 'email_id', 'member_email')
    .where(function () {
      for (const [emailId, emails] of emailsByEmailId) {
        this.orWhere(function () {
          this.where('email_id', emailId).whereIn('member_email', Array.from(emails));
        });
      }
    });
  const recipients = await query;

  for (const recipient of recipients) {
    recipientCache.set(`${recipient.member_email}:${recipient.email_id}`, {
      emailRecipientId: recipient.id,
      memberId: recipient.member_id,
      emailId: recipient.email_id,
    });
  }
  return recipientCache;
}

const pendingOpenedUpdates = new WeakMap();
let currentWriteShape = 'native-case';
let currentWriteBufferSize = PAGE_SIZE;
let pageFlushCalls = 0;
let expectedPageFlushCalls = 0;
let writeBufferStats;
let recipientIdCollation;

function collectOpenedUpdate(storage, event) {
  let updates = pendingOpenedUpdates.get(storage);
  if (!updates) {
    updates = new Map();
    pendingOpenedUpdates.set(storage, updates);
  }

  const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
  const existing = updates.get(event.emailRecipientId);
  if (!existing || timestamp < existing) {
    updates.set(event.emailRecipientId, timestamp);
  }
}

async function flushOpenedUpdatesCase(updates, connection = db.knex) {
  const recipientIds = updates.map(([id]) => id);
  const caseClauses = updates
    .map(([id, timestamp]) => `WHEN '${id}' THEN '${timestamp}'`)
    .join(' ');
  const sql = `
    UPDATE email_recipients
    SET opened_at = CASE id ${caseClauses} END
    WHERE id IN (${recipientIds.map(() => '?').join(',')})
    AND opened_at IS NULL
  `;
  await connection.raw(sql, recipientIds);
}

async function flushOpenedUpdatesGroupedIn(updates, connection = db.knex) {
  const idsByTimestamp = new Map();
  for (const [id, timestamp] of updates) {
    const ids = idsByTimestamp.get(timestamp) || [];
    ids.push(id);
    idsByTimestamp.set(timestamp, ids);
  }

  for (const [timestamp, recipientIds] of idsByTimestamp) {
    await connection('email_recipients')
      .whereIn('id', recipientIds)
      .whereNull('opened_at')
      .update({ opened_at: timestamp });
  }
}

async function flushOpenedUpdatesJsonTable(updates, connection = db.knex) {
  const payload = JSON.stringify(updates.map(([id, openedAt]) => ({ id, opened_at: openedAt })));
  const sql = `
    UPDATE email_recipients AS recipient
    JOIN JSON_TABLE(
      ?,
      '$[*]' COLUMNS (
        id CHAR(24) CHARACTER SET utf8mb4 COLLATE ${recipientIdCollation} PATH '$.id',
        opened_at DATETIME PATH '$.opened_at'
      )
    ) AS pending ON pending.id = recipient.id
    SET recipient.opened_at = pending.opened_at
    WHERE recipient.opened_at IS NULL
  `;
  await connection.raw(sql, [payload]);
}

async function flushOpenedUpdatesTemporaryTable(updates, connection = db.knex) {
  const tableName = `email_analytics_benchmark_open_updates_${process.pid}`;
  await connection.raw(`
      CREATE TEMPORARY TABLE ${tableName} (
        id CHAR(24) CHARACTER SET utf8mb4 COLLATE ${recipientIdCollation} NOT NULL PRIMARY KEY,
        opened_at DATETIME NOT NULL
      ) ENGINE=MEMORY
    `);
  try {
    await connection.batchInsert(
      tableName,
      updates.map(([id, openedAt]) => ({ id, opened_at: openedAt })),
      1000,
    );
    await connection.raw(`
        UPDATE email_recipients AS recipient
        JOIN ${tableName} AS pending
          ON pending.id = recipient.id
        SET recipient.opened_at = pending.opened_at
        WHERE recipient.opened_at IS NULL
      `);
  } finally {
    await connection.raw(`DROP TEMPORARY TABLE IF EXISTS ${tableName}`);
  }
}

async function applyOpenedUpdatesByShape(updates, connection) {
  if (currentWriteShape === 'case' || currentWriteShape === 'native-case') {
    await flushOpenedUpdatesCase(updates, connection);
  } else if (currentWriteShape === 'grouped-in') {
    await flushOpenedUpdatesGroupedIn(updates, connection);
  } else if (currentWriteShape === 'json-table') {
    await flushOpenedUpdatesJsonTable(updates, connection);
  } else if (currentWriteShape === 'temporary-table') {
    await flushOpenedUpdatesTemporaryTable(updates, connection);
  } else {
    throw new Error(`Unknown write shape: ${currentWriteShape}`);
  }
}

async function flushOpenedUpdatesByShape(storage) {
  const pending = pendingOpenedUpdates.get(storage);
  const updates = Array.from(pending?.entries() || []);
  if (updates.length === 0) {
    return;
  }

  let transitionedCount = updates.length;
  if (WRITE_BUFFER_SIZE_MATRIX_ENABLED) {
    transitionedCount = await db.knex.transaction(async (transaction) => {
      const recipientIds = updates.map(([id]) => id);
      const recipients = await transaction('email_recipients')
        .select('id', 'member_id', 'email_id')
        .whereIn('id', recipientIds)
        .whereNull('opened_at')
        .orderBy('id')
        .forUpdate();
      const transitionedIds = new Set(recipients.map(({ id }) => id));
      const transitionedUpdates = updates.filter(([id]) => transitionedIds.has(id));

      if (transitionedUpdates.length === 0) {
        return 0;
      }

      await applyOpenedUpdatesByShape(transitionedUpdates, transaction);

      const recipientIdsByEmail = new Map();
      const memberIdsByIncrement = new Map();
      const incrementsByMember = new Map();
      for (const recipient of recipients) {
        recipientIdsByEmail.set(
          recipient.email_id,
          (recipientIdsByEmail.get(recipient.email_id) || 0) + 1,
        );
        incrementsByMember.set(
          recipient.member_id,
          (incrementsByMember.get(recipient.member_id) || 0) + 1,
        );
      }

      for (const [emailId, increment] of recipientIdsByEmail) {
        await transaction('emails').where('id', emailId).increment('opened_count', increment);
      }
      for (const [memberId, increment] of incrementsByMember) {
        const memberIds = memberIdsByIncrement.get(increment) || [];
        memberIds.push(memberId);
        memberIdsByIncrement.set(increment, memberIds);
      }
      for (const [increment, memberIds] of memberIdsByIncrement) {
        await transaction('members')
          .whereIn('id', memberIds)
          .increment('email_opened_count', increment);
      }

      return transitionedUpdates.length;
    });
  } else {
    await applyOpenedUpdatesByShape(updates, db.knex);
  }

  pending.clear();
  writeBufferStats.transactionCount += 1;
  writeBufferStats.transitionedRecipients += transitionedCount;
  writeBufferStats.maxPendingRecipients = Math.max(
    writeBufferStats.maxPendingRecipients,
    updates.length,
  );
  storage.recordEventStored('opened', transitionedCount);
}

async function maybeFlushOpenedUpdatesByShape(storage) {
  pageFlushCalls += 1;
  const pendingCount = pendingOpenedUpdates.get(storage)?.size || 0;
  const isFinalPage = pageFlushCalls >= expectedPageFlushCalls;
  if (pendingCount < currentWriteBufferSize && !isFinalPage) {
    return;
  }
  await flushOpenedUpdatesByShape(storage);
}

const emailIdSets = new WeakMap();
const memberIdSets = new WeakMap();

function mergeEventProcessingResultLinear(other = {}) {
  this.delivered += other.delivered || 0;
  this.opened += other.opened || 0;
  this.temporaryFailed += other.temporaryFailed || 0;
  this.permanentFailed += other.permanentFailed || 0;
  this.unsubscribed += other.unsubscribed || 0;
  this.complained += other.complained || 0;
  this.unhandled += other.unhandled || 0;
  this.unprocessable += other.unprocessable || 0;
  this.processingFailures += other.processingFailures || 0;

  let emailIds = emailIdSets.get(this);
  if (!emailIds || (this.emailIds.length === 0 && emailIds.size > 0)) {
    emailIds = new Set(this.emailIds);
    emailIdSets.set(this, emailIds);
  }
  for (const emailId of other.emailIds || []) {
    if (emailId && !emailIds.has(emailId)) {
      emailIds.add(emailId);
      this.emailIds.push(emailId);
    }
  }

  let memberIds = memberIdSets.get(this);
  if (!memberIds || (this.memberIds.length === 0 && memberIds.size > 0)) {
    memberIds = new Set(this.memberIds);
    memberIdSets.set(this, memberIds);
  }
  for (const memberId of other.memberIds || []) {
    if (memberId && !memberIds.has(memberId)) {
      memberIds.add(memberId);
      this.memberIds.push(memberId);
    }
  }
}

const describeBenchmark = BENCHMARK_ENABLED ? describe : describe.skip;

describeBenchmark('Email analytics synthetic E2E benchmark', function () {
  let events;
  let pages = [];
  let syntheticRecipients;
  let emailId;
  let pageFetches = 0;
  let historicalRecipientRows = 0;
  let historySeedMs = 0;
  let preexistingActiveRecipientRows = 0;
  let untouchedActiveRecipientRows = 0;
  let activeSendSeedMs = 0;

  beforeAll(async function () {
    assert.ok(
      [
        'current',
        'incremental-production',
        'aggregation-disabled',
        'aggregation-disabled-grouped-lookup',
        'aggregation-disabled-grouped-lookup-linear-merge',
        'aggregation-disabled-grouped-lookup-linear-merge-last-seen-disabled',
        'grouped-lookup-linear-merge-last-seen-disabled',
      ].includes(SCENARIO),
      `Unknown EMAIL_ANALYTICS_BENCHMARK_SCENARIO: ${SCENARIO}`,
    );
    assert.ok(UNIQUE_RECIPIENTS > 0, 'recipient count must be positive');
    assert.ok(
      Number.isInteger(ACTIVE_SEND_RECIPIENTS) && ACTIVE_SEND_RECIPIENTS >= UNIQUE_RECIPIENTS,
      'active send recipient count must be an integer greater than or equal to touched recipients',
    );
    assert.ok(DUPLICATE_RATE >= 0 && DUPLICATE_RATE < 1, 'duplicate rate must be in [0, 1)');
    assert.ok(
      PAGE_SIZES.length > 0 &&
        PAGE_SIZES.every((pageSize) => Number.isInteger(pageSize) && pageSize > 0),
      'page sizes must be positive integers',
    );
    assert.ok(
      Number.isInteger(FETCH_PAGE_SIZE) && FETCH_PAGE_SIZE > 0,
      'fetch page size must be a positive integer',
    );
    assert.ok(
      WRITE_BUFFER_SIZES.length > 0 &&
        WRITE_BUFFER_SIZES.every(
          (writeBufferSize) => Number.isInteger(writeBufferSize) && writeBufferSize > 0,
        ),
      'write buffer sizes must be positive integers',
    );
    assert.ok(
      WRITE_SHAPES.length > 0 &&
        WRITE_SHAPES.every((shape) =>
          ['native-case', 'case', 'grouped-in', 'json-table', 'temporary-table'].includes(shape),
        ),
      'write shapes must be supported',
    );
    assert.ok(
      Number.isInteger(HISTORY_RECIPIENTS_PER_MEMBER) && HISTORY_RECIPIENTS_PER_MEMBER >= 0,
      'history rows per member must be a non-negative integer',
    );
    assert.ok(
      HISTORY_OPEN_RATE >= 0 && HISTORY_OPEN_RATE <= 1,
      'history open rate must be in [0, 1]',
    );

    configUtils.set('emailAnalytics:batchProcessing', true);
    configUtils.set('bulkEmail:mailgun', {
      apiKey: 'benchmark-key',
      domain: 'benchmark.example.com',
      baseUrl: 'https://api.mailgun.net',
    });

    sinon.stub(Queries.prototype, 'getLastEventTimestamp').resolves(new Date(2000, 0, 1));
    if (SCENARIO.includes('aggregation-disabled')) {
      sinon.stub(Queries.prototype, 'aggregateEmailStats').resolves();
      sinon.stub(Queries.prototype, 'aggregateMemberStatsBatch').resolves();
      sinon.stub(Queries.prototype, 'aggregateMemberStats').resolves();
      sinon.stub(Queries.prototype, 'reconcileMemberStats').resolves(0);
    }
    if (SCENARIO.includes('grouped-lookup')) {
      sinon
        .stub(EmailEventProcessor.prototype, 'batchGetRecipients')
        .callsFake(batchGetRecipientsGroupedByEmail);
    }
    if (SCENARIO.includes('linear-merge')) {
      sinon
        .stub(EventProcessingResult.prototype, 'merge')
        .callsFake(mergeEventProcessingResultLinear);
    }
    if (SCENARIO.endsWith('last-seen-disabled')) {
      sinon.stub(LastSeenAtUpdater.prototype, 'updateLastSeenAtWithoutKnownLastSeen').resolves();
    }
    if (WRITE_SHAPE_MATRIX_ENABLED) {
      sinon.stub(NewsletterEmailEventStorage.prototype, 'handleOpened').callsFake(function (event) {
        collectOpenedUpdate(this, event);
      });
      sinon
        .stub(NewsletterEmailEventStorage.prototype, 'flushBatchedUpdates')
        .callsFake(function () {
          return maybeFlushOpenedUpdatesByShape(this);
        });
    }

    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');

    if (WRITE_SHAPE_MATRIX_ENABLED) {
      const recipientIdColumn = await db
        .knex('information_schema.columns')
        .select('COLLATION_NAME as collation_name')
        .whereRaw('TABLE_SCHEMA = DATABASE()')
        .where({ TABLE_NAME: 'email_recipients', COLUMN_NAME: 'id' })
        .first();
      recipientIdCollation = recipientIdColumn?.collation_name;
      assert.match(
        recipientIdCollation || '',
        /^[a-z0-9_]+$/,
        'email_recipients.id must have a safe, known collation',
      );
    }

    const emailBatch = fixtureManager.get('email_batches', 0);
    emailId = emailBatch.email_id;
    await db.knex('emails').where({ id: emailId }).update({ track_opens: true });

    syntheticRecipients = await seedRecipients({
      emailId,
      batchId: emailBatch.id,
    });
    const activeRecipientsBeforePadding = await db
      .knex('email_recipients')
      .where('email_id', emailId)
      .count('id as count')
      .first();
    const currentActiveRecipientCount = Number(activeRecipientsBeforePadding.count);
    preexistingActiveRecipientRows = currentActiveRecipientCount - UNIQUE_RECIPIENTS;
    const activeSendSeedStartedAt = performance.now();
    untouchedActiveRecipientRows = await seedUntouchedActiveRecipients({
      emailId,
      batchId: emailBatch.id,
      currentRecipientCount: currentActiveRecipientCount,
    });
    activeSendSeedMs = performance.now() - activeSendSeedStartedAt;
    if (HISTORY_RECIPIENTS_PER_MEMBER > 0) {
      const historyEmail = fixtureManager.get('emails', 1);
      const historyBatchId = ObjectId().toHexString();
      const now = new Date();
      await db.knex('emails').where({ id: historyEmail.id }).update({ track_opens: true });
      await db.knex('email_batches').insert({
        id: historyBatchId,
        email_id: historyEmail.id,
        status: 'submitted',
        fallback_sending_domain: false,
        created_at: now,
        updated_at: now,
      });
      const historySeedStartedAt = performance.now();
      historicalRecipientRows = await seedHistoricalRecipients({
        recipients: syntheticRecipients,
        emailId: historyEmail.id,
        batchId: historyBatchId,
      });
      historySeedMs = performance.now() - historySeedStartedAt;
    }
    events = buildEvents({
      recipients: syntheticRecipients,
      emailId,
      providerId: emailBatch.mailgun_message_id,
    });

    sinon.stub(MailgunClient.prototype, 'getInstance').returns({});
    sinon
      .stub(MailgunClient.prototype, 'getEventsFromMailgun')
      .callsFake(async function (_instance, _domain, options) {
        if (PAGE_LATENCY_MS > 0) {
          await sleep(PAGE_LATENCY_MS);
        }
        const pageIndex = options.page === undefined ? 0 : Number(options.page);
        pageFetches += 1;
        return {
          items: pages[pageIndex] || [],
          pages: {
            next: {
              page: String(pageIndex + 1),
            },
          },
        };
      });
  }, 600_000);

  afterAll(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  async function runBenchmark(pageSize, writeShape, writeBufferSize = pageSize) {
    await fs.mkdir(PROFILE_DIR, { recursive: true });
    currentWriteShape = writeShape;
    currentWriteBufferSize = writeBufferSize;
    await db
      .knex('email_recipients')
      .whereIn(
        'id',
        syntheticRecipients.map(({ id }) => id),
      )
      .update({ opened_at: null });
    await db
      .knex('members')
      .whereIn(
        'id',
        syntheticRecipients.map(({ member_id: memberId }) => memberId),
      )
      .update({ email_opened_count: 0 });
    await db.knex('emails').where('id', emailId).update({ opened_count: 0 });

    const analyticsQueries = new Queries(db.knex);
    const syntheticMemberIds = syntheticRecipients.map(({ member_id: memberId }) => memberId);
    for (let index = 0; index < syntheticMemberIds.length; index += 100) {
      await analyticsQueries.aggregateMemberStatsBatch(
        syntheticMemberIds.slice(index, index + 100),
      );
    }
    const memberCountersBefore = await db
      .knex('members')
      .whereIn('id', syntheticMemberIds)
      .sum('email_opened_count as opened_count')
      .first();

    pages = [];
    for (let index = 0; index < events.length; index += pageSize) {
      pages.push(events.slice(index, index + pageSize));
    }
    pageFetches = 0;
    pageFlushCalls = 0;
    expectedPageFlushCalls = pages.length;
    writeBufferStats = {
      transactionCount: 0,
      transitionedRecipients: 0,
      maxPendingRecipients: 0,
    };

    const databaseInstrumentation = instrumentDatabase(db.knex);
    const eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
    eventLoopDelay.enable();
    const cpuStart = process.cpuUsage();
    const memoryStart = process.memoryUsage();
    const eventLoopStart = performance.eventLoopUtilization();
    const session = await startCpuProfile();
    const startedAt = performance.now();

    const fetchResult = await emailAnalytics.newsletters.service.fetchLatestOpenedEvents({
      maxEvents: Infinity,
    });
    const serviceReturnedAt = performance.now();
    await DomainEvents.allSettled();
    const completedAt = performance.now();

    const profile = await stopCpuProfile(session);
    eventLoopDelay.disable();
    const sql = databaseInstrumentation.stop();
    const cpu = process.cpuUsage(cpuStart);
    const memoryEnd = process.memoryUsage();
    const eventLoop = performance.eventLoopUtilization(eventLoopStart);

    const timestamp = new Date().toISOString().replaceAll(':', '-');
    const basename = `email-analytics-${SCENARIO}-${UNIQUE_RECIPIENTS}-send-${ACTIVE_SEND_RECIPIENTS}-fetch-${pageSize}-buffer-${writeBufferSize}-write-${writeShape}-history-${HISTORY_RECIPIENTS_PER_MEMBER}-${process.pid}-${timestamp}`;
    const profilePath = path.join(PROFILE_DIR, `${basename}.cpuprofile`);
    const summaryPath = path.join(PROFILE_DIR, `${basename}.json`);
    const cpuProfileSummary = summarizeCpuProfile(profile);
    const summary = {
      scenario: SCENARIO,
      database: process.env.NODE_ENV,
      inputs: {
        uniqueRecipients: UNIQUE_RECIPIENTS,
        activeSendRecipients: ACTIVE_SEND_RECIPIENTS,
        preexistingActiveRecipientRows,
        untouchedActiveRecipientRows,
        activeSendSeedMs: Number(activeSendSeedMs.toFixed(1)),
        duplicateEvents: events.length - UNIQUE_RECIPIENTS,
        totalEvents: events.length,
        duplicateRate: Number(((events.length - UNIQUE_RECIPIENTS) / events.length).toFixed(4)),
        pageSize,
        fetchPageSize: pageSize,
        writeBufferSize,
        writeTransactions: writeBufferStats.transactionCount,
        transitionedRecipients: writeBufferStats.transitionedRecipients,
        maxPendingRecipients: writeBufferStats.maxPendingRecipients,
        writeShape,
        pageLatencyMs: PAGE_LATENCY_MS,
        pageFetches,
        historyRecipientsPerMember: HISTORY_RECIPIENTS_PER_MEMBER,
        lifetimeRecipientsPerMember: HISTORY_RECIPIENTS_PER_MEMBER + 1,
        historyOpenRate: HISTORY_OPEN_RATE,
        historicalRecipientRows,
        historySeedMs: Number(historySeedMs.toFixed(1)),
      },
      timings: {
        serviceReturnMs: Number((serviceReturnedAt - startedAt).toFixed(1)),
        domainEventDrainMs: Number((completedAt - serviceReturnedAt).toFixed(1)),
        fullStackMs: Number((completedAt - startedAt).toFixed(1)),
        ...fetchResult,
        result: {
          opened: fetchResult.result.opened,
          unprocessable: fetchResult.result.unprocessable,
          emailIds: fetchResult.result.emailIds.length,
          memberIds: fetchResult.result.memberIds.length,
        },
      },
      process: {
        cpuUserMs: Number((cpu.user / 1000).toFixed(1)),
        cpuSystemMs: Number((cpu.system / 1000).toFixed(1)),
        eventLoopUtilization: Number(eventLoop.utilization.toFixed(4)),
        eventLoopDelayMeanMs: Number((eventLoopDelay.mean / 1e6).toFixed(2)),
        eventLoopDelayMaxMs: Number((eventLoopDelay.max / 1e6).toFixed(2)),
        heapUsedDeltaMb: Number(
          ((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024).toFixed(1),
        ),
        rssDeltaMb: Number(((memoryEnd.rss - memoryStart.rss) / 1024 / 1024).toFixed(1)),
      },
      sql,
      cpuProfile: cpuProfileSummary,
      artifacts: {
        profilePath,
        summaryPath,
      },
    };

    await fs.writeFile(profilePath, JSON.stringify(profile));
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    const openedRecipients = await db
      .knex('email_recipients')
      .whereIn(
        'id',
        syntheticRecipients.map(({ id }) => id),
      )
      .whereNotNull('opened_at')
      .count('id as count')
      .first();
    const activeSendRecipientCount = await db
      .knex('email_recipients')
      .where('email_id', emailId)
      .count('id as count')
      .first();
    const activeSendOpenedCount = await db
      .knex('email_recipients')
      .where('email_id', emailId)
      .whereNotNull('opened_at')
      .count('id as count')
      .first();
    const openedRecipientRows = await db
      .knex('email_recipients')
      .select('member_email', 'opened_at')
      .whereIn(
        'id',
        syntheticRecipients.map(({ id }) => id),
      );
    const emailCounters = await db
      .knex('emails')
      .select('opened_count')
      .where('id', emailId)
      .first();
    const memberCounters = await db
      .knex('members')
      .whereIn(
        'id',
        syntheticRecipients.map(({ member_id: memberId }) => memberId),
      )
      .sum('email_opened_count as opened_count')
      .first();
    const expectedOpenedAtByEmail = new Map();
    for (const event of events) {
      const expectedTimestamp = moment.utc(event.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
      const existing = expectedOpenedAtByEmail.get(event.recipient);
      if (!existing || expectedTimestamp < existing) {
        expectedOpenedAtByEmail.set(event.recipient, expectedTimestamp);
      }
    }

    assert.equal(fetchResult.eventCount, events.length);
    assert.equal(fetchResult.result.opened, events.length);
    assert.equal(Number(openedRecipients.count), UNIQUE_RECIPIENTS);
    assert.equal(Number(activeSendRecipientCount.count), ACTIVE_SEND_RECIPIENTS);
    assert.equal(Number(emailCounters.opened_count), Number(activeSendOpenedCount.count));
    assert.equal(
      Number(memberCounters.opened_count),
      Number(memberCountersBefore.opened_count) + UNIQUE_RECIPIENTS,
    );
    if (WRITE_BUFFER_SIZE_MATRIX_ENABLED) {
      assert.equal(writeBufferStats.transitionedRecipients, UNIQUE_RECIPIENTS);
    }
    assert.equal(openedRecipientRows.length, UNIQUE_RECIPIENTS);
    for (const recipient of openedRecipientRows) {
      assert.equal(
        moment.utc(recipient.opened_at).format('YYYY-MM-DD HH:mm:ss'),
        expectedOpenedAtByEmail.get(recipient.member_email),
      );
    }

    // eslint-disable-next-line no-console -- machine-readable output for the opt-in benchmark
    console.log(`EMAIL_ANALYTICS_BENCHMARK_RESULT ${JSON.stringify(summary)}`);
  }

  it('profiles paginated event ingestion through the full Ghost stack', async function () {
    if (WRITE_BUFFER_SIZE_MATRIX_ENABLED) {
      for (const writeBufferSize of WRITE_BUFFER_SIZES) {
        for (const writeShape of WRITE_SHAPES) {
          await runBenchmark(FETCH_PAGE_SIZE, writeShape, writeBufferSize);
        }
      }
      return;
    }

    for (const pageSize of PAGE_SIZES) {
      for (const writeShape of WRITE_SHAPES) {
        await runBenchmark(pageSize, writeShape);
      }
    }
  }, 600_000);
});
