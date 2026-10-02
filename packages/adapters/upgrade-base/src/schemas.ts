import { z } from 'zod';
import { upgradeDiagnosticsSchema } from './diagnostics.ts';

// Release identifiers are opaque to Ghost; hosts own version and channel policy.
export const upgradeVersionSchema = z.string().min(1).max(128);
export const upgradeJobIdSchema = z.uuid({ version: 'v4' }).lowercase();
// Ghost scopes the client's UUID to the authenticated staff user before handing
// it to the adapter. This key identifies intent; it is never a client-chosen job ID.
const upgradeIdempotencyKeySchema = z.hash('sha256').lowercase();
const timestamp = z.iso.datetime();

const upgradeStateSchema = z.enum([
  'queued',
  'checking',
  'blocked',
  'pulling',
  'backing-up',
  'restarting',
  'verifying',
  'restoring',
  'done',
  'failed',
  'rolled-back',
  'recovery-required',
]);

const upgradeTargetSchema = z.object({ version: upgradeVersionSchema });
const supportedStatus = z.object({
  supported: z.literal(true),
  backupRequired: z.literal(true),
  currentVersion: upgradeVersionSchema,
  targets: z.array(upgradeTargetSchema),
  activeJobId: upgradeJobIdSchema.nullable().optional(),
  pollAfterMs: z.int().min(1000).max(60000).optional(),
  diagnostics: upgradeDiagnosticsSchema.optional(),
});
export const upgradeStatusSchema = z.union([
  z.object({ supported: z.literal(false), reason: z.enum(['not-configured', 'not-supported']) }),
  supportedStatus.extend({ availability: z.literal('ready') }),
  supportedStatus.partial({ currentVersion: true, targets: true }).extend({
    availability: z.enum(['busy', 'unavailable', 'blocked']),
  }),
]);

export const createUpgradeRequestSchema = z
  .object({
    targetVersion: upgradeVersionSchema,
    idempotencyKey: upgradeIdempotencyKeySchema,
  })
  .strict();
export const upgradeJobSchema = z.object({
  id: upgradeJobIdSchema,
  state: upgradeStateSchema,
  targetVersion: upgradeVersionSchema.optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
  diagnostics: upgradeDiagnosticsSchema.optional(),
});
// Acceptance requires complete metadata; lookup can report a job still being claimed.
export const acceptedUpgradeJobSchema = upgradeJobSchema.required({
  targetVersion: true,
  createdAt: true,
  updatedAt: true,
});
export const upgradeJobResultSchema = z.union([
  upgradeJobSchema,
  z.object({ id: upgradeJobIdSchema, state: z.enum(['unknown', 'expired']) }),
]);
export const upgradeErrorCodeSchema = z.enum([
  'unsupported',
  'unavailable',
  'busy',
  'target-unapproved',
  'idempotency-conflict',
  'request-expired',
  'checks-failed',
]);

export type UpgradeState = z.infer<typeof upgradeStateSchema>;
export type UpgradeStatus = z.infer<typeof upgradeStatusSchema>;
export type CreateUpgradeRequest = z.infer<typeof createUpgradeRequestSchema>;
export type UpgradeJob = z.infer<typeof upgradeJobSchema>;
export type AcceptedUpgradeJob = z.infer<typeof acceptedUpgradeJobSchema>;
export type UpgradeJobResult = z.infer<typeof upgradeJobResultSchema>;
export type UpgradeErrorCode = z.infer<typeof upgradeErrorCodeSchema>;
