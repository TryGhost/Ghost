import { z } from 'zod';
import type { PresencePollResult } from '@tryghost/admin-x-framework/api/presence';

export type {
  ActivePresence,
  PresencePollResult,
  PresenceResource,
  PresenceResourceType,
} from '@tryghost/admin-x-framework/api/presence';

export const RESOURCE_TYPES = ['post', 'page'] as const;

const activeSchema = z.object({
  userId: z.string(),
  resourceId: z.string(),
  resourceType: z.enum(RESOURCE_TYPES),
  ts: z.number().finite(),
});

const responseSchema = z.object({
  presence: z
    .array(z.object({ active: z.array(activeSchema), serverTime: z.number().finite() }))
    .length(1),
});

/** Throws when the server answers with a shape this client does not know. */
export function parsePresenceResponse(response: unknown): PresencePollResult {
  return responseSchema.parse(response).presence[0];
}
