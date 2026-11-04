import crypto from 'node:crypto';
import type { RedisOptions } from 'bullmq';
import * as configUtils from './config-utils';

const jobsService = require('../../core/server/services/jobs-service');

// One prefix per process, fixed because JobsService keeps its first backend.
// Its keys are deleted on each reset instead.
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

export function getBullMQConnection(): RedisOptions {
  // Drop connectionName so helper clients aren't mistaken for the backend's
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

export async function resetJobsBackend(): Promise<void> {
  await jobsService.shutdown();
  if (!isBullMQ()) {
    return;
  }
  await deleteKeys();
  configUtils.set('adapters:jobs:BullMQJobsBackend:prefix', prefix);
}
