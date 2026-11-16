import { z } from 'zod';

const positiveMs = z.int().positive();

/**
 * The jobs outbox: dispatches are written to a table in the caller's
 * transaction and relayed to the jobs backend after commit. defaults.json
 * supplies every key. Closed: the jobs service reads only these.
 */
export const jobsOutbox = z
  .object({
    enabled: z.boolean().meta({
      description:
        'Dispatch jobs through the outbox table. Needs MySQL; other databases keep direct dispatch.',
      examples: [true, false],
    }),
    keepUntilSettled: z.boolean().meta({
      description:
        'Keep each row until its job settles, so a job cut short by a restart is handed over again once its lease runs out. Off, the row goes at hand-off.',
      examples: [true, false],
    }),
    pollIntervalMs: positiveMs.meta({
      description:
        'How often the relay polls for rows, in milliseconds. A fallback: dispatches in this process wake the relay on commit.',
      examples: [30000],
    }),
    submissionTimeoutMs: positiveMs.meta({
      description: 'How long a hand-off to the jobs backend may take, in milliseconds.',
      examples: [10000],
    }),
    retryDelayMs: positiveMs.meta({
      description: 'Wait before retrying a failed hand-off, in milliseconds.',
      examples: [30000],
    }),
    // submitted_at has one-second precision and is renewed every quarter
    // lease, so a shorter lease could expire between renewals
    leaseMs: z
      .int()
      .min(2000)
      .meta({
        description:
          'How long a handed-over row can go unrenewed before another process hands it over again, in milliseconds. At least 2000.',
        examples: [120000],
      }),
  })
  .meta({ description: 'The transactional outbox for background jobs.' });

/**
 * Settings for individual services. Loose: services:recommendations and others
 * are read but have no schema yet.
 */
export const services = z
  .looseObject({
    jobs: z.looseObject({ outbox: jobsOutbox }).meta({ description: 'Background jobs.' }),
  })
  .meta({ description: 'Settings for individual services.' });
