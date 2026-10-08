import { actorFrom, readFrameIdentity } from '../../lib/actor';
import type { WriteOrigin } from './schema';

/**
 * Who made a write through the Admin API and where, read the same way as `actingContext`, so
 * the values a request writes and the actions it logs name the same writer. Null when
 * nobody is acting, which no Admin API write should be.
 */
export function adminWriteOrigin(context: unknown): WriteOrigin | null {
  const identity = readFrameIdentity(context);
  const actor = actorFrom(identity);
  if (!actor) {
    return null;
  }
  if (actor.type === 'integration') {
    return { writtenBy: { type: 'integration', id: actor.id }, source: 'admin_api' };
  }
  // A staff token authenticates as its user but is a call to the API, not a visit to Admin.
  return {
    writtenBy: { type: 'user', id: actor.id },
    source: identity.viaApiKey ? 'admin_api' : 'admin',
  };
}
