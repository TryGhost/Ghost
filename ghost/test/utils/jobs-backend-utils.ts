import crypto from 'node:crypto';
import type { RedisOptions } from 'bullmq';
import * as configUtils from './config-utils';

const jobsService = require('../../core/server/services/jobs-service');

// On the BullMQ jobs backend, every test process gets its own Redis key prefix,
// so parallel workers never consume each other's jobs. JobsService keeps the
// backend it was first given for the life of the process, so the prefix cannot
// change between boots. Instead its keys are deleted whenever the backend stops,
// and every boot starts on empty queues. Nothing here touches Redis on the
// in-memory backend.
const prefix = `ghost-test-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

export function isBullMQ(): boolean {
  return configUtils.config.get('adapters:jobs:active') === 'BullMQJobsBackend';
}

export function getBullMQPrefix(): string {
  return prefix;
}

interface Scanner {
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
}

// For a test's own client on the Redis the jobs backend uses
export function getBullMQConnection(): RedisOptions {
  // connectionName marks the backend's own clients, which tests look for by name
  const { connectionName: _connectionName, ...connection } =
    configUtils.config.get('adapters:jobs:BullMQJobsBackend:connection') ?? {};
  return Object.fromEntries(Object.entries(connection).filter(([, value]) => value !== null));
}

// SCAN and DEL, never FLUSHALL: other workers share this Redis
async function deleteKeys(): Promise<void> {
  // Required here so that the in-memory backend never loads bullmq
  const { Queue } = require('bullmq');
  const queue = new Queue('cleanup', { connection: getBullMQConnection(), prefix });
  try {
    const client = (await queue.client) as unknown as Scanner;
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 500);
      cursor = next;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } finally {
    await queue.close();
  }
}

/**
 * Stops the jobs backend and leaves it ready for the next boot: on BullMQ,
 * this process's queues are emptied and its prefix is configured.
 */
export async function resetJobsBackend(): Promise<void> {
  await jobsService.shutdown();
  if (!isBullMQ()) {
    return;
  }
  await deleteKeys();
  configUtils.set('adapters:jobs:BullMQJobsBackend:prefix', prefix);
}
