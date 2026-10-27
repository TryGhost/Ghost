import assert from 'node:assert/strict';
import type { DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import errors from '@tryghost/errors';
import BullMQJobsBackend from '../../../../../core/server/adapters/jobs/BullMQJobsBackend';

const prefix = 'test-prefix';

// What ioredis is given, without opening a connection
function connectionOptions(backend: BullMQJobsBackend, method: string) {
  return (backend as unknown as Record<string, () => Record<string, unknown>>)[method]!();
}

const envelope: DispatchEnvelope = {
  version: 1,
  payload: { job: { type: 'test-job', payload: '{}' } },
};

// These tests never start the backend, so they open no Redis connection.
describe('BullMQJobsBackend', function () {
  it('has the required contract methods', function () {
    const backend = new BullMQJobsBackend({ prefix });
    for (const fn of backend.requiredFns) {
      assert.equal(typeof backend[fn], 'function', `${fn} is a function`);
    }
  });

  it('accepts a prefix alone', function () {
    assert.doesNotThrow(() => new BullMQJobsBackend({ prefix }));
  });

  it('reads all-digit string settings parsed from the environment as strings', function () {
    const backend = new BullMQJobsBackend({
      prefix: 48213,
      connection: {
        username: 111,
        password: 222,
        sentinels: [{ host: 'sentinel-a', port: 26379 }],
        name: 333,
        sentinelUsername: 444,
        sentinelPassword: 555,
        connectionName: 666,
      },
    }) as unknown as { _prefix: unknown; _connection: Record<string, unknown> };

    assert.equal(backend._prefix, '48213');
    assert.equal(backend._connection.username, '111');
    assert.equal(backend._connection.password, '222');
    assert.equal(backend._connection.name, '333');
    assert.equal(backend._connection.sentinelUsername, '444');
    assert.equal(backend._connection.sentinelPassword, '555');
    assert.equal(backend._connection.connectionName, '666');
  });

  for (const config of [{ concurency: 10 }, { connection: { sentinel: [] } }]) {
    it(`rejects the unknown key in ${JSON.stringify(config)}`, function () {
      const key = Object.keys(Object.values(config)[0] as object)[0] ?? Object.keys(config)[0];
      assert.throws(
        () => new BullMQJobsBackend({ prefix, ...config }),
        (err: Error) =>
          err instanceof errors.IncorrectUsageError && err.message.includes(`"${key}"`),
      );
    });
  }

  it('accepts a null connection username and password as none', function () {
    assert.doesNotThrow(
      () => new BullMQJobsBackend({ prefix, connection: { username: null, password: null } }),
    );
  });

  for (const [field, value] of [
    ['concurrency', 0],
    ['concurrency', '3'],
    ['concurrency', null],
    ['prefix', ''],
    ['prefix', null],
    ['lockDuration', -1],
    ['lockDuration', null],
    ['stalledInterval', 1.5],
    ['stalledInterval', null],
    ['maxStalledCount', null],
    ['maxStalledCount', -1],
    ['timezone', 'Not/AZone'],
    ['timezone', 42],
    ['connection', { port: 0 }],
    ['connection', null],
    ['connection', { port: null }],
    ['connection', { port: '6379' }],
    ['connection', { host: '' }],
    ['connection', { host: null }],
    ['connection', { db: -1 }],
    ['connection', { db: null }],
    ['connection', { tls: null }],
    ['connection', { connectionName: '' }],
    ['connection', { connectionName: null }],
    ['connection', { tls: 'yes' }],
    ['connection', { sentinel: [{ host: 'a', port: 1 }] }],
    ['connection', { sentinels: [] }],
    ['connection', { sentinels: null }],
    ['connection', { name: 'jobs' }],
    ['connection', { name: null }],
    ['connection', { sentinelTLS: null }],
    ['connection', { sentinelTLS: 'yes' }],
    ['connection', { enableTLSForSentinelMode: null }],
    ['connection', { enableTLSForSentinelMode: 'yes' }],
  ] as const) {
    it(`rejects an invalid ${field} config ${JSON.stringify(value)}`, function () {
      // The full path to the bad key, such as "connection.port"
      const paths =
        value !== null && typeof value === 'object'
          ? Object.keys(value).map((key) => `${field}.${key}`)
          : [field];
      assert.throws(
        () => new BullMQJobsBackend({ prefix, [field]: value }),
        (err: Error) =>
          err instanceof errors.IncorrectUsageError &&
          /Invalid jobs backend/.test(err.message) &&
          paths.some((path) => err.message.includes(`at "${path}"`)),
      );
    });
  }

  it('rejects a missing prefix, naming it', function () {
    assert.throws(
      () => new BullMQJobsBackend({}),
      (err: Error) =>
        err instanceof errors.IncorrectUsageError && err.message.includes('at "prefix"'),
    );
  });

  describe('sentinel connection', function () {
    const sentinels = [
      { host: 'sentinel-a', port: 26379 },
      { host: 'sentinel-b', port: 26380 },
    ];

    function assertRejected(connection: Record<string, unknown>, path: string) {
      assert.throws(
        () => new BullMQJobsBackend({ prefix, connection }),
        (err: Error) =>
          err instanceof errors.IncorrectUsageError && err.message.includes(`at "${path}"`),
      );
    }

    it('rejects sentinels without a name', function () {
      assertRejected({ sentinels }, 'connection.name');
    });

    it('rejects host and port alongside sentinels, as a half-migrated config', function () {
      assertRejected({ sentinels, name: 'jobs', host: 'redis' }, 'connection.host');
      assertRejected({ sentinels, name: 'jobs', port: 6379 }, 'connection.port');
    });

    it('rejects TLS config that would leave the data-node password in plaintext', function () {
      const name = 'jobs';
      assertRejected({ sentinels, name, tls: true }, 'connection.enableTLSForSentinelMode');
      assertRejected(
        { sentinels, name, tls: true, enableTLSForSentinelMode: false },
        'connection.enableTLSForSentinelMode',
      );
      assertRejected({ sentinels, name, enableTLSForSentinelMode: true }, 'connection.tls');
      assertRejected({ sentinels, name, sentinelTLS: true }, 'connection.tls');
    });

    it('rejects Sentinel TLS options without sentinels', function () {
      assertRejected(
        { tls: true, enableTLSForSentinelMode: true },
        'connection.enableTLSForSentinelMode',
      );
      assertRejected({ tls: true, sentinelTLS: true }, 'connection.sentinelTLS');
    });

    it('rejects a malformed or unknown key in a sentinel entry', function () {
      assertRejected({ sentinels: [{ host: 'a' }], name: 'jobs' }, 'connection.sentinels.0.port');
      assertRejected(
        { sentinels: [{ host: 'a', port: 1, tls: true }], name: 'jobs' },
        'connection.sentinels.0.tls',
      );
    });

    it('resolves the ioredis options, with no host or port', function () {
      const backend = new BullMQJobsBackend({
        prefix,
        connection: {
          sentinels,
          name: 'jobs',
          username: 'data-user',
          password: 'data-pass',
          tls: true,
          sentinelUsername: 'sentinel-user',
          sentinelPassword: 'sentinel-pass',
          sentinelTLS: true,
          enableTLSForSentinelMode: true,
          db: 0,
        },
      });

      const { retryStrategy, ...producer } = connectionOptions(backend, '_producerConnection');
      assert.equal(typeof retryStrategy, 'function');
      const expected = {
        sentinels,
        name: 'jobs',
        username: 'data-user',
        password: 'data-pass',
        tls: {},
        sentinelUsername: 'sentinel-user',
        sentinelPassword: 'sentinel-pass',
        sentinelTLS: {},
        enableTLSForSentinelMode: true,
        db: 0,
      };
      assert.deepEqual(producer, {
        ...expected,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      assert.deepEqual(connectionOptions(backend, '_workerConnection'), {
        ...expected,
        maxRetriesPerRequest: null,
      });
    });

    it('drops null sentinel credentials and leaves failoverDetector off', function () {
      const backend = new BullMQJobsBackend({
        prefix,
        connection: { sentinels, name: 'jobs', sentinelUsername: null, sentinelPassword: null },
      });
      assert.deepEqual(connectionOptions(backend, '_workerConnection'), {
        sentinels,
        name: 'jobs',
        maxRetriesPerRequest: null,
      });
    });

    it('applies the default host and port only without sentinels', function () {
      const backend = new BullMQJobsBackend({ prefix });
      assert.deepEqual(connectionOptions(backend, '_workerConnection'), {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: null,
      });
    });
  });

  it('throws on an enqueue before start instead of silently losing the job', async function () {
    await assert.rejects(
      async () => new BullMQJobsBackend({ prefix }).enqueue('d1', envelope),
      /before the jobs backend is started/,
    );
  });

  it('accepts a null timezone as the process timezone', function () {
    assert.doesNotThrow(() => new BullMQJobsBackend({ prefix, timezone: null }));
  });

  it('throws on a recurring schedule before start', async function () {
    await assert.rejects(
      async () =>
        new BullMQJobsBackend({ prefix }).scheduleRecurring(envelope, { cron: '* * * * *' }),
      /before the jobs backend is started/,
    );
  });

  it('rejects an invalid declared queue concurrency at start instead of silently ignoring it', function () {
    assert.throws(
      () =>
        new BullMQJobsBackend({ prefix }).start({
          processor: async () => {},
          queues: { bad: { concurrency: 0 } },
        }),
      /Invalid concurrency for declared queue "bad"/,
    );
  });
});
