import { z } from 'zod';

const schema = z.object({
  enabled: z.boolean().default(false),
  // Keeps each row until its job settles, so a job cut short by a restart is
  // handed over again at the next boot. Off, the row goes at hand-off.
  keepUntilSettled: z.boolean().default(false),
  // A fallback: dispatches in this process wake the relay on commit, so the
  // poll only picks up retries and rows written by another process.
  pollIntervalMs: z.number().int().positive().default(30000),
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
