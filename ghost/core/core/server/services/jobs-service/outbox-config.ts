import { z } from 'zod';

// The jobs service owns its own config slice (per core/shared/config/SCHEMA.md:
// a feature validates its own keys next to the code that reads them). Defaults
// live here, not in defaults.json, so production stays on the legacy direct
// path unless a site opts in. Precedent: services:recommendations:enabled.
const schema = z.object({
  // Off by default: the outbox table is in-development and absent in
  // production until the versioned migration lands, so enabling it there is a
  // deliberate, separately-sequenced step.
  enabled: z.boolean().default(false),
  // How long the relay waits between polling cycles once the table is drained.
  pollIntervalMs: z.number().int().positive().default(1000),
  // Bounds how long the relay holds a row lock while a submission is in flight.
  submissionTimeoutMs: z.number().int().positive().default(10000),
  // How far forward a failed entry's available_at is moved before a retry.
  retryDelayMs: z.number().int().positive().default(30000),
});

export type OutboxConfig = z.infer<typeof schema>;

export interface ConfigReader {
  get(key: string): unknown;
}

export function getOutboxConfig(config: ConfigReader): OutboxConfig {
  // Parsing a frozen config subtree returns a fresh, unfrozen object.
  return schema.parse(config.get('services:jobs:outbox') ?? {});
}
