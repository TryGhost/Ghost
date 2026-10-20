import type { GhostLogger } from '@tryghost/logging';
import {
  COLLECTION_FLAG,
  type AskedPart,
  type AskedParts,
  type Asking,
  type CheckoutCollection,
  type CheckoutDefinition,
  type CheckoutSessionConfig,
  type CollectedSection,
  type StripeCheckoutDesign,
} from './models';
import type { StripeCheckoutConfigService } from './service';

/** The private flag the config is behind. The collected parts are behind their own flag too. */
const DESIGN_FLAG = 'stripeCheckoutDesign';

/** Every collected part asking for nothing. */
export const NOTHING_COLLECTED = Object.freeze({ shipping: null, phone: null } satisfies Record<
  CollectedSection,
  null
>);

/** How a checkout asks for each collected part: as set, without the tiers it covers. */
const ASKING: { [Section in CollectedSection]: (part: AskedParts[Section]) => Asking[Section] } = {
  shipping: ({ allowedCountries }) => ({ allowedCountries }),
  phone: () => ({}),
};

/**
 * The checkout the config makes for a subscription to this paid tier: its design, asking for
 * each collected part that covers the tier and has somewhere to keep the answer.
 */
function checkoutForTier(config: CheckoutSessionConfig, tierId: string): CheckoutDefinition {
  const ask = <Section extends CollectedSection>(
    section: Section,
    part: AskedParts[Section] | null,
  ): Asking[Section] | null =>
    part !== null && asksOn(part, tierId) ? ASKING[section](part) : null;
  return {
    design: config.design,
    asks: { shipping: ask('shipping', config.shipping), phone: ask('phone', config.phone) },
  };
}

/**
 * The collected parts as saved, with the parts a preview gives in their place. A part the
 * preview gives as undefined asks as saved, like one it leaves out.
 */
function withPreviewed(
  saved: CheckoutCollection | null,
  previewed: Partial<CheckoutCollection>,
): CheckoutCollection {
  return {
    shipping: previewed.shipping !== undefined ? previewed.shipping : (saved?.shipping ?? null),
    phone: previewed.phone !== undefined ? previewed.phone : (saved?.phone ?? null),
  };
}

/** Whether a checkout for this paid tier asks for what a collected part collects. */
function asksOn(part: AskedPart, tierId: string) {
  return part.collectable && (part.tierIds === null || part.tierIds.includes(tierId));
}

/** What deciding checkouts needs. */
export interface CheckoutServiceDeps {
  config: Pick<StripeCheckoutConfigService, 'readForCheckout'>;
  labs: { isSet(flag: string): boolean };
  logging: GhostLogger;
}

/**
 * Decides the Stripe Checkout pages Ghost opens from the site's config: the checkout a buyer
 * gets, and previews of settings not saved yet. Nothing from the config applies while its
 * flags are off, and a checkout Ghost has no settings for is null, so Stripe uses the
 * merchant's own.
 */
export class CheckoutService {
  private deps: CheckoutServiceDeps;

  constructor(deps: CheckoutServiceDeps) {
    this.deps = deps;
  }

  /** The checkout for a subscription to this paid tier. */
  async readForTier(tierId: string): Promise<CheckoutDefinition | null> {
    const config = await this.readConfig();
    return config && checkoutForTier(config, tierId);
  }

  /** The checkout for a donation, a gift or a card update, which aren't for a tier: the design only. */
  async read(): Promise<CheckoutDefinition | null> {
    const config = await this.readConfig();
    return config && { design: config.design, asks: NOTHING_COLLECTED };
  }

  /**
   * The checkout a preview opens for this paid tier: in the given design, asking for the
   * collected parts it gives in place of the saved ones, and for the rest as saved.
   */
  async preview(
    tierId: string,
    draft: { design: StripeCheckoutDesign | null } & Partial<CheckoutCollection>,
  ): Promise<CheckoutDefinition> {
    const collection = this.collecting()
      ? withPreviewed(await this.readConfig(), draft)
      : NOTHING_COLLECTED;
    return checkoutForTier({ design: draft.design, ...collection }, tierId);
  }

  /**
   * The config as checkouts use it, without the collected parts while their flag is off. Null
   * while the design flag is off or the config can't be read.
   */
  private async readConfig(): Promise<CheckoutSessionConfig | null> {
    // The collected parts only release after the design, so nothing is read while it's off.
    if (!this.deps.labs.isSet(DESIGN_FLAG)) {
      return null;
    }
    const config = await this.readSaved();
    if (!config) {
      return null;
    }
    return this.collecting() ? config : { design: config.design, ...NOTHING_COLLECTED };
  }

  private collecting(): boolean {
    return this.deps.labs.isSet(COLLECTION_FLAG);
  }

  /**
   * The config as saved, or null when it can't be read. This never throws: a checkout without
   * Ghost's settings still takes payment, while a failed one doesn't.
   */
  private async readSaved(): Promise<CheckoutSessionConfig | null> {
    try {
      return await this.deps.config.readForCheckout();
    } catch (err) {
      this.deps.logging.error(
        { event: { name: 'stripe_checkout.config.read_failed' }, err },
        'Failed to read the Stripe Checkout config',
      );
      return null;
    }
  }
}
