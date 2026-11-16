import { z } from 'zod';

const schema = z.object({
  enabled: z.boolean().default(false),
  // Keeps each row until its job settles, so a job cut short by a restart is
  // handed over again once its lease runs out. Off, the row goes at hand-off.
  keepUntilSettled: z.boolean().default(false),
  // A fallback: dispatches in this process wake the relay on commit, so the
  // poll only picks up retries and rows written by another process.
  pollIntervalMs: z.number().int().positive().default(30000),
  submissionTimeoutMs: z.number().int().positive().default(10000),
  retryDelayMs: z.number().int().positive().default(30000),
  // How long a submitted row can go without its holder renewing it before
  // another process hands it over again. submitted_at has one-second precision
  // and is renewed every quarter lease, so a shorter lease could expire between
  // renewals.
  leaseMs: z.number().int().min(2000).default(120000),
});

export type OutboxConfig = z.infer<typeof schema>;

export interface ConfigReader {
  get(key: string): unknown;
}

export function getOutboxConfig(config: ConfigReader): OutboxConfig {
  return schema.parse(config.get('services:jobs:outbox') ?? {});
}
