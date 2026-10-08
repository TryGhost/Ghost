import { recordCheckoutConfigAction, type RecordCheckoutConfigAction } from './actions';
import { StripeCheckoutConfigService } from './service';

export { StripeCheckoutConfigService } from './service';
export type { StripeCheckoutConfig, StripeCheckoutDesign } from './models';
export { toCheckoutConfigResponse } from './serializers';
export { actingContext } from './actions';
export type { RequestContext } from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has
// connected.
export let service: StripeCheckoutConfigService | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordCheckoutConfigAction = (input) =>
    recordCheckoutConfigAction({ Action: models.Action, ...input });
  service = new StripeCheckoutConfigService({ knex, recordAction });
}
