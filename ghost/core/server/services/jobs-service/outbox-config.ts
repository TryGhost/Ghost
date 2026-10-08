import { z } from 'zod';

const schema = z.object({
  enabled: z.boolean().default(false),
  pollIntervalMs: z.number().int().positive().default(1000),
  submissionTimeoutMs: z.number().int().positive().default(10000),
  retryDelayMs: z.number().int().positive().default(30000),
});

export type OutboxConfig = z.infer<typeof schema>;

export interface ConfigReader {
  get(key: string): unknown;
}

export function getOutboxConfig(config: ConfigReader): OutboxConfig {
  return schema.parse(config.get('services:jobs:outbox') ?? {});
}
