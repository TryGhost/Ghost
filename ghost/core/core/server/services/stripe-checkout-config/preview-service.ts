import errors from '@tryghost/errors';
import type { StripeCheckoutDesign } from './models';
import { CheckoutPreviewInput, parseRequest } from './serializers';

/** The parts of a tier a preview checks before opening a checkout for it. */
export interface PreviewableTier {
  type: string;
  status: string;
}

/**
 * What a preview needs from the rest of Ghost. The tier `readTier` returns is the one
 * `createPreviewLink` is given, so the link is built from the whole tier, not just the parts
 * checked here.
 */
export interface CheckoutPreviewDeps<Tier extends PreviewableTier> {
  stripeConnected: () => boolean;
  readTier: (id: string) => Promise<Tier | null>;
  createPreviewLink: (params: {
    tier: Tier;
    cadence: 'month' | 'year';
    design: StripeCheckoutDesign | null;
    returnUrl: string;
  }) => Promise<string | null>;
  siteUrl: () => string;
}

/**
 * Opens real Stripe Checkout pages for previewing a design before it is saved. A preview is
 * an ordinary checkout for the tier, so it saves nothing in Ghost.
 */
export class CheckoutPreviewService<Tier extends PreviewableTier> {
  private deps: CheckoutPreviewDeps<Tier>;

  constructor(deps: CheckoutPreviewDeps<Tier>) {
    this.deps = deps;
  }

  /** Creates a checkout for an active paid tier in the requested design, and returns its page. */
  async add(input: unknown): Promise<{ url: string }> {
    const request = parseRequest(CheckoutPreviewInput, input, 'checkout_preview');

    if (!this.deps.stripeConnected()) {
      throw new errors.ValidationError({ message: 'Connect Stripe to preview checkout.' });
    }

    const tier = await this.deps.readTier(request.tier_id);
    if (!tier || tier.type !== 'paid' || tier.status !== 'active') {
      throw new errors.ValidationError({
        message: 'Choose an active paid tier to preview checkout for.',
        property: 'tier_id',
      });
    }

    const url = await this.deps.createPreviewLink({
      tier,
      cadence: request.cadence,
      design: request.design,
      returnUrl: this.deps.siteUrl(),
    });
    if (!url) {
      throw new errors.InternalServerError({
        message: 'Stripe returned no checkout page to preview.',
      });
    }
    return { url };
  }
}
