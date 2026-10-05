import errors from '@tryghost/errors';
import type { Frame } from '@tryghost/api-framework';
import { validate } from '@tryghost/admin-api-schema';
import { upgradeJobIdSchema } from '@tryghost/adapter-base-upgrade';

const inputFields = new Set(['target_version', 'idempotency_key']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Unknown execution controls must be rejected before shared validation strips them. */
export async function add(_apiConfig: unknown, frame: Frame): Promise<void> {
  const upgrades = frame.data.upgrades;
  const request = Array.isArray(upgrades) ? (upgrades[0] as unknown) : undefined;

  if (
    Object.keys(frame.data).some((key) => key !== 'upgrades') ||
    (isRecord(request) && Object.keys(request).some((key) => !inputFields.has(key)))
  ) {
    throw new errors.ValidationError({
      message: 'Unrecognized update request field.',
      help: 'Send only upgrades, target_version and idempotency_key.',
    });
  }

  await validate({ data: frame.data, schema: 'upgrades-add' });

  // JSON Schema validates UUID syntax; update intents require version 4.
  const input = (frame.data.upgrades as [{ idempotency_key: string }])[0];
  if (!upgradeJobIdSchema.safeParse(input.idempotency_key).success) {
    throw new errors.ValidationError({
      message: 'A lowercase UUID v4 idempotency_key is required.',
      context: 'Each update intent requires its own client-generated request key.',
      help: 'Generate a UUID v4 once and reuse it when retrying the same intent.',
    });
  }
}

/** The shared option validator only accepts ObjectIds; upgrade jobs use UUID v4. */
export function validateJobId(frame: Frame): void {
  if (!upgradeJobIdSchema.safeParse(frame.options.id).success) {
    throw new errors.ValidationError({
      message: 'A lowercase UUID v4 job ID is required.',
      help: 'Use the job ID returned when the host accepted the update request.',
    });
  }
}
