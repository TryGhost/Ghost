/**
 * What a tier's checkout asks and collects.
 *
 * A domain of its own rather than part of the Tier aggregate: a tier is loaded into memory
 * once at boot, and these rows are read live because deleting a custom field cascades a
 * question away without that repository ever seeing it.
 *
 * Constructed by the tiers service wrapper at boot, which already holds the collaborators
 * this needs, rather than by an init() here — the custom field services are built before
 * it, so both are ready by the time it runs.
 */
export { TierCheckoutConfigService } from './service';

export {
  CheckoutConfigResult,
  CheckoutQuestion,
  PhoneCollection,
  ResolvedCheckout,
  ResolvedQuestion,
  ShippingCollection,
  TierCheckoutConfig,
} from './models';

export { toCheckoutConfigResponse } from './serializers';
