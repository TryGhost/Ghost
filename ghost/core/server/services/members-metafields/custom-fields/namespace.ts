import type { LimitService } from '@tryghost/limit-service';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import type { Members } from '../members-resource';
import type { Access, AvailabilityLimit, NamespaceRegistration } from '../metafields/namespaces';

/**
 * Custom fields: the publisher's own namespace on members, with its owner, limits and access.
 * Staff with the custom fields permission manage them, and a host can switch them off. How many
 * a site can hold is Members' limit, the one every namespace on members has.
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
    access: CUSTOM_FIELDS_ACCESS,
  };
}

/**
 * Staff, integrations and Ghost itself read and write every custom field. Members get nothing
 * from the namespace: each field stores what its member may do, which the publisher sets per
 * field. Apps and anonymous requests get nothing.
 */
export const CUSTOM_FIELDS_ACCESS: Access<Members> = {
  staff: 'write',
  integration: 'write',
  internal: 'write',
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
