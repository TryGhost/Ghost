import type { LimitService } from '@tryghost/limit-service';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { MEMBER_ACCESS, type Caller } from '../callers';
import type { Members } from '../members-resource';
import type {
  AvailabilityLimit,
  Grant,
  AccessPolicy,
  NamespaceRegistration,
} from '../metafields/namespaces';

/**
 * Custom fields: the publisher's own namespace on members, with its owner, limits and access
 * policy. Staff with the custom fields permission manage them, and a host can switch them off.
 * How many a site can hold is Members' limit, the one every namespace on members has. Staff reach
 * every field, and the publisher opens each one to members, or not, with its member access.
 */
export function customFields({
  limitService,
}: {
  limitService: Pick<LimitService, 'isDisabled' | 'errorIfWouldGoOverLimit'>;
}): NamespaceRegistration<Members> {
  return {
    namespace: CUSTOM_NAMESPACE,
    owner: { staff: 'member_custom_field' },
    limits: [hostSwitch(limitService, 'limitCustomFields')],
    accessPolicy: memberAccessPolicy,
  };
}

const EVERY_FIELD: Grant = { fields: 'all' };

/**
 * What each caller can read: staff and Ghost itself can read every custom field, and a member
 * can read the ones whose member access is set to read or write.
 */
const READABLE: Record<Caller, Grant> = {
  admin: EVERY_FIELD,
  internal: EVERY_FIELD,
  members: { fields: 'by member access', levels: [MEMBER_ACCESS.read, MEMBER_ACCESS.write] },
};

/**
 * What each caller can write: a member can write only the custom fields whose member access
 * is set to write.
 */
const WRITABLE: Record<Caller, Grant> = {
  admin: EVERY_FIELD,
  internal: EVERY_FIELD,
  members: { fields: 'by member access', levels: [MEMBER_ACCESS.write] },
};

/** The custom namespace's access policy, which depends on each field's member access setting. */
export const memberAccessPolicy: AccessPolicy<Members> = {
  read: (caller) => READABLE[caller],
  write: (caller) => WRITABLE[caller],
};

/**
 * A host limit that switches a feature off. The limit service is asked each time, as a host's
 * limits can change while Ghost runs, and its error carries the host's own words.
 */
function hostSwitch(
  limitService: Pick<LimitService, 'isDisabled' | 'errorIfWouldGoOverLimit'>,
  name: string,
): AvailabilityLimit {
  return {
    kind: 'availability',
    isAvailable: () => limitService.isDisabled(name) !== true,
    refuse: () => limitService.errorIfWouldGoOverLimit(name),
  };
}
