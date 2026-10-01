import errors from '@tryghost/errors';
import { ADMIN } from './access';
import { adminWriteOrigin, type AdminWriteOrigin } from './actions';
import type { MetafieldValuesService, PlannedWrite } from './values-service';

/** Values the Admin API was asked to write, and the member of staff or integration writing them. */
export interface AdminWritePlan {
  writes: PlannedWrite[];
  origin: AdminWriteOrigin;
}

/**
 * Takes the metafields out of an Admin API payload and plans their write. Throws on an
 * invalid value, or when the request has no user or integration to name as the writer.
 * Returns null when there is nothing to write.
 *
 * Planned before the record is touched, so a bad value refuses the whole request.
 */
export async function planAdminWrite(
  values: Pick<MetafieldValuesService, 'unwrapWire' | 'planWrite'>,
  payload: { metafields?: unknown },
  context: unknown,
): Promise<AdminWritePlan | null> {
  const metafields = values.unwrapWire(payload.metafields);
  delete payload.metafields;
  if (metafields === undefined) {
    return null;
  }

  const writes = await values.planWrite(metafields, ADMIN);
  if (writes.length === 0) {
    return null;
  }

  // Every value reaching here was typed into the Admin API, so the writer is whoever made
  // the request — the same pair the action log records, so the two agree about who did it
  // rather than one saying only that it was "admin".
  //
  // The only route here is the authenticated Admin API, so an anonymous request is a
  // mistake somewhere upstream rather than a writer to invent a name for. Refusing keeps
  // every stored writer resolvable.
  const origin = adminWriteOrigin(context);
  if (!origin) {
    throw new errors.IncorrectUsageError({
      message:
        'Custom field values cannot be set by a request with no authenticated user or integration.',
    });
  }

  return { writes, origin };
}

/**
 * A record's metafields as a response shows them, or undefined to leave the key off when
 * the record has none. Most sites define no metafields, so their responses read exactly
 * as they did before metafields existed.
 */
export function visibleMetafields(
  metafields: Record<string, Record<string, unknown>> | undefined,
): Record<string, Record<string, unknown>> | undefined {
  return metafields && Object.keys(metafields).length > 0 ? metafields : undefined;
}
