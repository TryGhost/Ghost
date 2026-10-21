import { createMutation, createQuery, createQueryWithId } from '../utils/api/hooks';

import type {
  createUpgradeRequestSchema,
  upgradeDiagnosticSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
} from '@tryghost/adapter-base-upgrade';
import type { SnakeCasedPropertiesDeep } from 'type-fest';
import type { z } from 'zod';

// Host-managed Ghost updates. Older cores have no /upgrades/ endpoints (404).
// Ghost returns the contract's parsed output with snake_case keys.
type ApiOutput<Schema extends z.ZodType> = SnakeCasedPropertiesDeep<z.output<Schema>>;

export type UpgradeStatus = ApiOutput<typeof upgradeStatusSchema>;
export type UpgradeAvailability = Extract<UpgradeStatus, { supported: true }>['availability'];
export type OneClickUpdate = Extract<UpgradeStatus, { supported: true }>['one_click'][number];
export type ManualUpdate = Extract<UpgradeStatus, { supported: true }>['manual'][number];
export type UpgradeDiagnostic = ApiOutput<typeof upgradeDiagnosticSchema>;
export type UpgradeJob = ApiOutput<typeof upgradeJobSchema>;
export type UpgradeJobResult = ApiOutput<typeof upgradeJobResultSchema>;

// Runtime values Admin shares with the contract; diagnostic keys are the same in either case.
export { activeUpgradeStates, upgradeDiagnosticsSchema } from '@tryghost/adapter-base-upgrade';

export interface UpgradeStatusResponseType {
  upgrades: [UpgradeStatus];
}

export interface UpgradeJobResponseType {
  upgrades: [UpgradeJobResult];
}

export type UpgradeRequest = SnakeCasedPropertiesDeep<z.output<typeof createUpgradeRequestSchema>>;

const permissions: ['Owner', 'Administrator'] = ['Owner', 'Administrator'];

export const useBrowseUpgradeStatus = createQuery<UpgradeStatusResponseType>({
  dataType: 'UpgradeStatusResponseType',
  path: '/upgrades/',
  permissions,
});

export const useReadUpgradeJob = createQueryWithId<UpgradeJobResponseType>({
  dataType: 'UpgradeJobResponseType',
  path: (id) => `/upgrades/${id}/`,
  permissions,
});

export const useRequestUpgrade = createMutation<UpgradeJobResponseType, UpgradeRequest>({
  method: 'POST',
  path: () => '/upgrades/',
  body: (request) => ({ upgrades: [request] }),
  // A lost response is retried with the same key by the caller, not by the transport.
  retry: false,
  invalidateQueries: { dataType: 'UpgradeStatusResponseType' },
});
