import errors from '@tryghost/errors';
import type { PreviewShipping, StripeCheckoutDesign } from './models';
import { CheckoutPreviewInput, parseRequest } from './serializers';

// Stripe refuses a checkout that expires sooner than 30 minutes after it's created. The extra
// minute keeps a server clock running a little behind Stripe's from going under that.
const PREVIEW_LIFETIME_SECONDS = 31 * 60;

/** The parts of a tier a preview checks before opening a checkout for it. */
export interface PreviewableTier {
  type: string;
  status: string;
}

/**
 * What a preview needs from the rest of Ghost. The tier `readTier` returns is the one
 * `createPreviewLink` is given, so the link is built from the whole tier, not just the parts
 * checked here. `createPreviewLink` marks the checkout as a preview in Stripe.
 */
export interface CheckoutPreviewDeps<Tier extends PreviewableTier> {
  stripeConnected: () => boolean;
  readTier: (id: string) => Promise<Tier | null>;
  createPreviewLink: (params: {
    tier: Tier;
    cadence: 'month' | 'year';
    design: StripeCheckoutDesign | null;
    /** Left out, the checkout asks for an address as the saved settings say. */
    shipping?: PreviewShipping;
    returnUrl: string;
    expiresInSeconds: number;
  }) => Promise<string | null>;
  siteUrl: () => string;
}

/**
 * Opens real Stripe Checkout pages for previewing a design before it is saved. A preview is
 * an ordinary checkout for the tier, so it saves nothing in Ghost, but it can only be paid for
 * as long as Stripe allows the shortest checkout to last.
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

    const { shipping } = request;
    const url = await this.deps.createPreviewLink({
      tier,
      cadence: request.cadence,
      design: request.design,
      ...(shipping && {
        shipping:
          shipping.collect && (!shipping.tier_ids || shipping.tier_ids.includes(request.tier_id))
            ? { allowedCountries: shipping.allowed_countries ?? null }
            : null,
      }),
      returnUrl: this.deps.siteUrl(),
      expiresInSeconds: PREVIEW_LIFETIME_SECONDS,
    });
    if (!url) {
      throw new errors.InternalServerError({
        message: 'Stripe returned no checkout page to preview.',
      });
    }
    return { url };
  }
}
