import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import knex from 'knex';
import { MAX_STEPS_PER_BATCH } from '../../ghost/core/server/services/automations/constants.ts';

export type SmokeMode = 'baseline' | 'batch' | 'worker';
export const maxSmokeRecipients = 100_000;
const fakeMailgun = 'http://127.0.0.1:4010';
const fakeMailgunConfig = {
  apiKey: 'local-smoke',
  domain: 'fake.mailgun.test',
  baseUrl: fakeMailgun + '/v3',
};
const require = createRequire(import.meta.url);

function getMailpitOrigin() {
  const port = process.env.AUTOMATION_SMOKE_MAILPIT_PORT ?? '8025';
  assert(['8025', '18025', '28025', '38025'].includes(port), 'Use a supported local Mailpit port.');
  return `http://127.0.0.1:${port}`;
}

export function smokeAddress(automationId: string, index: number) {
  return `batch-smoke-${automationId}-${index}@example.invalid`;
}

export async function withSmokeDatabase({
  run,
  mode,
}: {
  run: (database: string) => Promise<void>;
  mode: SmokeMode;
}) {
  const database = `ghost_automation_smoke_${randomBytes(8).toString('hex')}`;
  const connection = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD ?? 'root',
  };

  // Worker mode uses Ghost's configured bulk client. The comparison modes
  // inject their own client and disable the configured transport.
  delete process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN;
  for (const key of Object.keys(process.env)) {
    if (/_proxy$/i.test(key)) delete process.env[key];
  }
  Object.assign(process.env, {
    NODE_ENV: 'development',
    url: 'http://127.0.0.1:2368',
    database__client: 'mysql2',
    database__connection__host: connection.host,
    database__connection__port: String(connection.port),
    database__connection__user: connection.user,
    database__connection__password: connection.password,
    database__connection__database: database,
    database__connection__socketPath: '',
    labs__automations: 'true',
    mail__transport: 'SMTP',
    mail__options__host: '127.0.0.1',
    mail__options__port: '1',
    bulkEmail__mailgun__apiKey: fakeMailgunConfig.apiKey,
    bulkEmail__mailgun__domain: fakeMailgunConfig.domain,
    bulkEmail__mailgun__baseUrl:
      mode === 'worker' ? fakeMailgunConfig.baseUrl : 'http://127.0.0.1:1/v3',
  });

  for (const url of [
    fakeMailgun + '/v3/fake.mailgun.test/events',
    getMailpitOrigin() + '/api/v1/info',
  ]) {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(3000) });
    assert(response.ok, `Local mail preflight failed: ${url}`);
    await response.json();
  }

  const admin = knex.default({ client: 'mysql2', connection });
  let created = false;
  try {
    await admin.raw('CREATE DATABASE ??', [database]);
    created = true;
    await run(database);
  } finally {
    try {
      if (created) await admin.raw('DROP DATABASE ??', [database]);
    } finally {
      await admin.destroy();
    }
  }
}

type Message = Record<string, unknown> & { html: string; plaintext: string };
type Variables = Record<string, Record<string, string>>;
type Delivery = (message: object, variables: object, replacements: unknown[]) => Promise<unknown>;
type Pending = { message: Message; variables: Variables };

function makeStageTimer() {
  let count = 0;
  let active = 0;
  let busySince = 0;
  let busyMs = 0;
  let totalMs = 0;
  return {
    start() {
      const start = performance.now();
      if (active++ === 0) busySince = start;
      return () => {
        const end = performance.now();
        count++;
        totalMs += end - start;
        if (--active === 0) busyMs += end - busySince;
      };
    },
    snapshot: () => ({ count, busyMs, totalMs }),
  };
}

export async function profileSmokeDrain<T>({
  knex: db,
  run,
}: {
  knex: knex.Knex;
  run: () => Promise<T>;
}) {
  type Render = (this: unknown, options: unknown) => Promise<unknown>;
  const { prototype } =
    require('../../ghost/core/server/services/member-welcome-emails/member-welcome-email-renderer.js') as {
      prototype: { render: Render };
    };
  const render = prototype.render;
  const rendering = makeStageTimer();
  const database = makeStageTimer();
  prototype.render = async function (options) {
    const finish = rendering.start();
    try {
      return await render.call(this, options);
    } finally {
      finish();
    }
  };

  type Query = { __knexQueryUid?: string };
  const inFlight = new Map<string, () => void>();
  const onQuery = ({ __knexQueryUid }: Query) => {
    if (__knexQueryUid) inFlight.set(__knexQueryUid, database.start());
  };
  const onQueryEnd = (_result: unknown, { __knexQueryUid }: Query) => {
    if (!__knexQueryUid) return;
    inFlight.get(__knexQueryUid)?.();
    inFlight.delete(__knexQueryUid);
  };
  db.on('query', onQuery).on('query-response', onQueryEnd).on('query-error', onQueryEnd);
  try {
    const result = await run();
    return { result, rendering: rendering.snapshot(), database: database.snapshot() };
  } finally {
    db.off('query', onQuery).off('query-response', onQueryEnd).off('query-error', onQueryEnd);
    prototype.render = render;
  }
}

function deferBatch() {
  let resolve!: (value: Promise<unknown>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((resolveBatch, rejectBatch) => {
    resolve = resolveBatch;
    reject = rejectBatch;
  });
  return { promise, resolve, reject };
}

function batchPayload(pending: Pending[]) {
  const normalized = pending.map(({ message, variables }) => {
    const { list_unsubscribe: url } = Object.values(variables)[0]!;
    assert(url, 'The smoke fixture should have a personalized unsubscribe URL.');
    const htmlUrl = url.replaceAll('&', '&amp;');
    const htmlToken = '%recipient.unsubscribe_html%';
    const textToken = '%recipient.list_unsubscribe%';
    const html = message.html.replaceAll(htmlUrl, htmlToken).replaceAll(url, htmlToken);
    const plaintext = message.plaintext.replaceAll(url, textToken);
    assert(
      html.includes(htmlToken) && plaintext.includes(textToken),
      'Missing unsubscribe link in rendered fixture.',
    );
    Object.values(variables)[0]!.unsubscribe_html = message.html.includes(htmlUrl) ? htmlUrl : url;
    return { ...message, html, plaintext };
  });
  const [template, ...remaining] = normalized;
  for (const message of remaining) {
    assert.deepEqual(message, template, 'Rendered messages differ beyond the unsubscribe link.');
  }
  return {
    message: template!,
    variables: Object.assign({}, ...pending.map((entry) => entry.variables)) as Variables,
  };
}

export function makeSmokeMailer({
  automationId,
  mode,
  recipientCount,
}: {
  automationId: string;
  mode: Exclude<SmokeMode, 'worker'>;
  recipientCount: number;
}) {
  assert(
    Number.isSafeInteger(recipientCount) &&
      recipientCount >= 2 &&
      recipientCount <= maxSmokeRecipients,
  );
  const recipients = new Set(
    Array.from({ length: recipientCount }, (_, i) => smokeAddress(automationId, i)),
  );
  const attempted = new Set<string>();
  const requestIds = new Set<string>();
  const provider = makeStageTimer();
  const pending: Pending[] = [];
  const client: { send: Delivery } =
    new (require('../../ghost/core/server/lib/mailgun/mailgun-client.js'))({
      config: { get: () => ({ mailgun: fakeMailgunConfig, batchSize: MAX_STEPS_PER_BATCH }) },
      settings: { get: () => undefined },
    });
  let batch: ReturnType<typeof deferBatch> | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let batchSize = 0;
  let batchExpired = false;

  const submit = async ({ message, variables }: Pending) => {
    const finish = provider.start();
    const result = await client.send(message, variables, []).finally(finish);
    assert(result && typeof result === 'object' && 'id' in result && typeof result.id === 'string');
    requestIds.add(result.id);
    return result;
  };

  const send: Delivery = async (message, variables, replacements) => {
    const [address, ...extra] = Object.keys(variables);
    assert(
      address && !extra.length && recipients.has(address),
      'Only the synthetic fixture recipients are allowed.',
    );
    assert(!attempted.has(address), 'The smoke test will not send to the same recipient twice.');
    assert(!batchExpired, 'The smoke test batch already timed out.');
    assert.equal(replacements.length, 0);
    attempted.add(address);

    const entry = { message: message as Message, variables: variables as Variables };
    if (mode === 'baseline') return submit(entry);

    if (!batch) {
      batchSize = Math.min(MAX_STEPS_PER_BATCH, recipientCount - attempted.size + 1);
      batch = deferBatch();
      timer = setTimeout(() => {
        batchExpired = true;
        batch?.reject(new Error('Some batch recipients did not arrive.'));
      }, 15_000);
    }
    pending.push(entry);
    const completion = batch.promise;
    if (pending.length === batchSize) {
      clearTimeout(timer);
      const ready = pending.splice(0);
      batch.resolve(
        Promise.resolve()
          .then(() => batchPayload(ready))
          .then(submit),
      );
      batch = undefined;
    }
    return completion;
  };

  return {
    send,
    providerTiming: provider.snapshot,
    async verifyInbox() {
      assert.equal(attempted.size, recipientCount);
      assert.equal(
        requestIds.size,
        mode === 'baseline' ? recipientCount : Math.ceil(recipientCount / MAX_STEPS_PER_BATCH),
      );
      const messagesInMailpit = await verifySmokeInbox({ automationId, recipients });
      return { requests: requestIds.size, messagesInMailpit };
    },
  };
}

export async function verifySmokeInbox({
  automationId,
  recipients,
}: {
  automationId: string;
  recipients: Set<string>;
}) {
  const recipientCount = recipients.size;
  const search = new URL('/api/v1/search', getMailpitOrigin());
  search.searchParams.set('query', `subject:${automationId}`);
  const pageSize = 1000;
  search.searchParams.set('limit', String(pageSize));
  const readPage = async (offset: number) => {
    search.searchParams.set('start', String(offset));
    const response = await fetch(search, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok, 'Could not search the local Mailpit inbox.');
    return (await response.json()) as {
      messages_count: number;
      messages: { To: { Address: string }[] }[];
    };
  };
  const deadline = performance.now() + 300_000;
  while (performance.now() < deadline) {
    const firstPage = await readPage(0);
    if (firstPage.messages_count >= recipientCount) {
      assert.equal(firstPage.messages_count, recipientCount);
      const remaining = new Set(recipients);
      const verifyPage = ({ messages }: Awaited<ReturnType<typeof readPage>>) => {
        for (const { To } of messages) {
          assert.equal(To.length, 1);
          assert(remaining.delete(To[0]!.Address), 'Unexpected or duplicate recipient in Mailpit.');
        }
      };
      verifyPage(firstPage);
      for (let offset = pageSize; offset < recipientCount; offset += pageSize) {
        const page = await readPage(offset);
        assert.equal(page.messages_count, recipientCount);
        verifyPage(page);
      }
      assert.equal(remaining.size, 0, 'Mailpit did not contain every fixture recipient.');
      return firstPage.messages_count;
    }
    await delay(500);
  }
  throw new Error(`Mailpit did not show all ${recipientCount} messages for ${automationId}.`);
}
