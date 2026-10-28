import assert from 'node:assert/strict';
import { Queue } from 'bullmq';
const { agentProvider } = require('../utils/e2e-framework');
// require, not import: the instance the boot path resets must be this one
const {
  getBullMQConnection,
  getBullMQPrefix,
  resetJobsBackend,
} = require('../utils/jobs-backend-utils');

interface KeysClient {
  keys(pattern: string): Promise<string[]>;
  set(key: string, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

describe('Jobs backend cleanup on BullMQ', function () {
  let inspect: Queue;
  let client: KeysClient;
  const otherKey = `ghost-test-other-${process.pid}:kept`;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    inspect = new Queue('inspect', { connection: getBullMQConnection() });
    client = (await inspect.client) as unknown as KeysClient;
  });

  afterAll(async function () {
    await client.del(otherKey);
    await inspect.close();
  });

  it("deletes every key under this process's prefix, and only those", async function () {
    const queue = new Queue('cleanup', {
      connection: getBullMQConnection(),
      prefix: getBullMQPrefix(),
    });
    await queue.add('leftover', {});
    await queue.close();
    await client.set(otherKey, '1');
    assert.notDeepEqual(await client.keys(`${getBullMQPrefix()}:*`), []);

    await resetJobsBackend();

    assert.deepEqual(await client.keys(`${getBullMQPrefix()}:*`), []);
    assert.deepEqual(await client.keys(otherKey), [otherKey]);
  });
});
