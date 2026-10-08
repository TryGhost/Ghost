import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import { camelKeys } from '../../lib/case-keys';
import { SnakeDesign } from './codec';
import type { StripeCheckoutBranding } from './models';

/**
 * The business name in the `branding_settings` Stripe reports on a new session. The design is
 * read on its own, so one Ghost can't show doesn't lose the name.
 */
const ResolvedIdentity = z.object({
  display_name: z.string(),
});

/** What reading the branding needs from Stripe. */
export interface CheckoutBrandingDeps {
  stripeConnected: () => boolean;
  /** Stripe's `branding_settings`, as Stripe resolves them for a new session. */
  readBranding: () => Promise<unknown>;
}

/**
 * Reads the checkout branding from Stripe. Nothing is cached, so a change in the Stripe
 * dashboard shows the next time it is read.
 */
export class CheckoutBrandingService {
  private deps: CheckoutBrandingDeps;

  constructor(deps: CheckoutBrandingDeps) {
    this.deps = deps;
  }

  async read(): Promise<StripeCheckoutBranding> {
    if (!this.deps.stripeConnected()) {
      throw new errors.ValidationError({
        message: 'Connect Stripe to read its checkout branding.',
      });
    }

    const branding = await this.deps.readBranding();
    const identity = ResolvedIdentity.safeParse(branding);
    if (!identity.success) {
      throw new errors.InternalServerError({
        message: 'Stripe reported checkout branding Ghost cannot show.',
        context: identity.error.message,
      });
    }

    const design = SnakeDesign.safeParse(branding);
    if (!design.success) {
      logging.warn(
        { event: { name: 'stripe_checkout.branding.design_unreadable' }, err: design.error },
        'Ignoring a Stripe Checkout design Ghost cannot show',
      );
    }

    return {
      displayName: identity.data.display_name,
      design: design.success ? camelKeys(design.data) : null,
    };
  }
}
