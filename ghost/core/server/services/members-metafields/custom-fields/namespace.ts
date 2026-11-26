import type { LimitService } from '@tryghost/limit-service';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { GHOST_APP_ID } from '../metafields/callers';
import type {
  AccessPolicy,
  AvailabilityLimit,
  NamespaceRegistration,
} from '../metafields/namespaces';

/**
 * Custom fields: the publisher's own namespace on members, which Ghost owns, with its limits and
 * access. A host can switch them off. How many a site can hold is Members' limit, the one every
 * namespace on members has.
 */
export function customFields({
  limitService,
}: {
  limitService: Pick<LimitService, 'isDisabled' | 'errorIfWouldGoOverLimit'>;
}): NamespaceRegistration {
  return {
    namespace: CUSTOM_NAMESPACE,
    owner: GHOST_APP_ID,
    limits: [hostSwitch(limitService, 'limitCustomFields')],
    access: CUSTOM_FIELDS_ACCESS,
  };
}

/**
 * Staff and integrations manage custom fields and write every one of them, as Ghost does. Which
 * staff may manage them is the custom fields permission's to say, which the Admin API checks
 * first. A member gets nothing from the namespace: each field stores what its member may do, which
 * the publisher sets per field. Other apps and anonymous requests get nothing.
 */
export const CUSTOM_FIELDS_ACCESS: AccessPolicy = {
  staff: 'manage',
  integration: 'manage',
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
