import errors from '@tryghost/errors';
import { ADMIN, INTERNAL, MEMBERS } from './access';
import { actingContext } from './actions';
import type { WriteOrigin } from './schema';

type OriginOf<T extends WriteOrigin['writtenBy']['type']> = Extract<
  WriteOrigin,
  { writtenBy: { type: T } }
>;

/**
 * Who is writing a member's metafields: what they may write, and how the write is recorded.
 * Only the pairings that happen are representable, so a member can't be given staff access.
 */
export type Writer =
  | { audience: typeof ADMIN; origin: OriginOf<'user' | 'integration'> }
  | { audience: typeof MEMBERS; origin: OriginOf<'member'> & { source: 'portal' } }
  | {
      audience: typeof INTERNAL;
      origin: OriginOf<'import' | 'binding'> | (OriginOf<'member'> & { source: 'checkout' });
    };

/** Staff or an integration writing through the Admin API. Throws when the request has neither. */
export function staffWriter(context: unknown): Writer {
  // Read with `actingContext`, as the action log is, so both name the same writer.
  const { actor } = actingContext(context);
  if (!actor) {
    throw new errors.IncorrectUsageError({
      message:
        'Custom field values cannot be set by a request with no authenticated user or integration.',
    });
  }
  if (actor.type === 'integration') {
    return {
      audience: ADMIN,
      origin: { writtenBy: { type: 'integration', id: actor.id }, source: 'admin_api' },
    };
  }
  // A staff token authenticates as its user but is a call to the API, not a visit to Admin.
  return {
    audience: ADMIN,
    origin: {
      writtenBy: { type: 'user', id: actor.id },
      source: actor.viaApiKey ? 'admin_api' : 'admin',
    },
  };
}

/** A member writing their own metafields from Portal. */
export function memberWriter(memberId: string): Writer {
  return {
    audience: MEMBERS,
    origin: { writtenBy: { type: 'member', id: memberId }, source: 'portal' },
  };
}
