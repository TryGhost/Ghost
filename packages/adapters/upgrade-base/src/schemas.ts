import { z } from 'zod';

// Release identifiers are opaque to Ghost; hosts own version and channel policy.
export const upgradeVersionSchema = z.string().min(1).max(128);
// Opaque to Ghost: a host may use a UUID, or the idempotency key itself.
export const upgradeJobIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

// Components are named by the host (`ghost`, `stack`, ...); Ghost renders them generically.
export const upgradeComponentSchema = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);

const code = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);
const text = z.string().min(1).max(2048);
const timestamp = z.iso.datetime();

/** Deliberately public, plain-text diagnostics, rather than serialized exceptions. */
export const upgradeDiagnosticSchema = z.object({
  source: code,
  code,
  severity: z.enum(['error', 'warning', 'info']),
  message: text,
  details: z.string().max(8192).optional(),
  help: z.url({ protocol: /^https$/ }).optional(),
});
export const upgradeDiagnosticsSchema = z.array(upgradeDiagnosticSchema).max(200);

/** An update the host can perform within its policy; Admin offers to run it. */
export const oneClickUpdateSchema = z.object({
  component: upgradeComponentSchema,
  fromVersion: upgradeVersionSchema,
  toVersion: upgradeVersionSchema,
});

/** An update that needs steps on the host; Admin shows it as a notice. */
export const manualUpdateSchema = oneClickUpdateSchema.extend({
  reason: text,
  steps: z.array(text).max(20),
});

export const upgradeStatusSchema = z.discriminatedUnion('supported', [
  z.object({
    supported: z.literal(false),
    reason: z.enum(['not-configured', 'not-supported']),
  }),
  z
    .object({
      supported: z.literal(true),
      // `stale`: the host executor stopped reporting; `incompatible`: protocol mismatch.
      availability: z.enum(['ready', 'busy', 'unavailable', 'stale', 'incompatible']),
      // Admin's backup promise before an update must match what the host enforces.
      backupRequired: z.boolean().optional(),
      currentVersion: upgradeVersionSchema.optional(),
      oneClick: z.array(oneClickUpdateSchema).max(50).default([]),
      manual: z.array(manualUpdateSchema).max(50).default([]),
      activeJobId: upgradeJobIdSchema.nullable().optional(),
      pollAfterMs: z.int().min(1000).max(60000).optional(),
      diagnostics: upgradeDiagnosticsSchema.optional(),
    })
    .refine((status) => status.availability !== 'ready' || status.backupRequired !== undefined, {
      message: 'A ready host must report its backup policy.',
      path: ['backupRequired'],
    }),
]);

export const createUpgradeRequestSchema = z
  .object({
    component: upgradeComponentSchema,
    toVersion: upgradeVersionSchema,
    // Ghost scopes the client's UUID to the staff user; it identifies intent, never a job.
    idempotencyKey: z.hash('sha256'),
  })
  .strict();

// `pending` is accepted but not yet claimed by the host; there is no queue.
export const activeUpgradeStates = [
  'pending',
  'backing-up',
  'pulling',
  'restarting',
  'verifying',
  'restoring',
] as const;
export const finalUpgradeStates = [
  'done',
  'restored',
  'needs-operator',
  'refused',
  'interrupted',
] as const;

export const upgradeJobSchema = z.object({
  id: upgradeJobIdSchema,
  state: z.enum([...activeUpgradeStates, ...finalUpgradeStates]),
  component: upgradeComponentSchema,
  fromVersion: upgradeVersionSchema.optional(),
  toVersion: upgradeVersionSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  diagnostics: upgradeDiagnosticsSchema.optional(),
});

/** Lookup distinguishes absent and expired records from temporary host failures. */
export const upgradeJobResultSchema = z.union([
  upgradeJobSchema,
  // Any ID can be unknown, including one that was never a valid job ID.
  z.object({ id: z.string(), state: z.literal('unknown') }),
  z.object({ id: upgradeJobIdSchema, state: z.literal('expired') }),
]);

export const upgradeErrorCodeSchema = z.enum([
  'unsupported',
  'unavailable',
  'busy',
  'target-unapproved',
  'idempotency-conflict',
  'request-expired',
]);

export type UpgradeDiagnostic = z.infer<typeof upgradeDiagnosticSchema>;
export type OneClickUpdate = z.infer<typeof oneClickUpdateSchema>;
export type ManualUpdate = z.infer<typeof manualUpdateSchema>;
export type UpgradeStatus = z.input<typeof upgradeStatusSchema>;
export type CreateUpgradeRequest = z.infer<typeof createUpgradeRequestSchema>;
export type UpgradeState = z.infer<typeof upgradeJobSchema>['state'];
export type UpgradeJob = z.infer<typeof upgradeJobSchema>;
export type UpgradeJobResult = z.infer<typeof upgradeJobResultSchema>;
export type UpgradeErrorCode = z.infer<typeof upgradeErrorCodeSchema>;
