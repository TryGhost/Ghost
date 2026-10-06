import logging from '@tryghost/logging';
import { STRIPE_ALLOWED_COUNTRIES } from '@tryghost/checkout';
import type { ResolvedCheckout, StripeCheckoutDesign } from '../../../stripe-checkout-config';

/**
 * The Stripe session parameters a tier's checkout configuration asks for.
 *
 * Two rules hold everything here together.
 *
 * **A site that has configured nothing sends exactly what it sent before.** Every key below
 * is added only when something asked for it, so an unconfigured site's session-create call
 * is byte-identical to the one it made before this existed. Automatic tax has already taken
 * Stripe checkout down twice from this code path, both times through a parameter
 * combination Stripe rejects, and a rejected session create is a publisher who cannot sell.
 *
 * **Every limit is applied again here, not just at the settings screen.** A configuration
 * written when the rules were laxer, or a field renamed longer since, must not be able to
 * fail a session create years later. Anything that would be refused is dropped and logged
 * instead — a missing collection costs one value, and a rejected session costs the sale.
 *
 * `customer_update` is never set *here*, because nothing here knows whether the session has
 * a customer, and setting it without one is the exact reproduction of the incident that took
 * the automatic tax beta down. Collecting a tax id does require it for an existing customer
 * — Stripe will not collect one for a customer it may not rename — so that pairing is made
 * where the customer is known, alongside the same rule automatic tax already follows.
 */

export interface StripeCheckoutCollectionOptions {
  shipping_address_collection?: { allowed_countries: string[] };
  tax_id_collection?: { enabled: true };
  phone_number_collection?: { enabled: true };
}

/**
 * Build the collection parameters for a checkout, or nothing at all.
 *
 * Returns an object with no keys when a tier asks for nothing, so a caller can spread it
 * over its session options unconditionally and change nothing.
 */
export function stripeCheckoutCollectionOptions(
  checkout: ResolvedCheckout | undefined,
): StripeCheckoutCollectionOptions {
  const options: StripeCheckoutCollectionOptions = {};
  if (!checkout) {
    return options;
  }

  if (checkout.shipping) {
    // Ghost stores "everywhere" as no list, because the set of countries moves and a
    // stored copy of it would quietly become a restriction. Stripe has no such sentinel:
    // `allowed_countries` is the only key `shipping_address_collection` has, so a request
    // that omits it carries no parameter at all, and Stripe accepts it precisely because
    // it was never asked to collect anything — a session that succeeds and collects no
    // address. So everywhere is expanded to every country here, at the one point that
    // builds the request.
    //
    // An empty list is neither everywhere nor a real restriction, and would encode to the
    // same absent parameter. Defended here rather than trusted from the settings screen:
    // this is the checkout path, and a malformed configuration must cost the collection
    // rather than throw inside a session build.
    const allowedCountries = checkout.shipping.allowedCountries ?? [...STRIPE_ALLOWED_COUNTRIES];
    if (allowedCountries.length === 0) {
      logging.warn(
        {
          event: { name: 'stripe.checkout.collection_skipped' },
          port: 'shipping_address',
          reason: 'no_allowed_countries',
        },
        'Skipping a Stripe checkout collection',
      );
    } else {
      options.shipping_address_collection = { allowed_countries: allowedCountries };
    }
  }

  // Unioned with whatever automatic tax asks for. Both want the same thing, so a site
  // running the 2024 tax beta keeps collecting and a site that asked for it starts.
  if (checkout.taxNumber) {
    options.tax_id_collection = { enabled: true };
  }

  if (checkout.phone) {
    options.phone_number_collection = { enabled: true };
  }

  return options;
}

export interface StripeCheckoutBrandingOptions {
  branding_settings?: {
    background_color: string;
    button_color: string;
    border_style: string;
    font_family: string;
  };
}

/**
 * The publisher's design as Stripe's `branding_settings`, or nothing.
 *
 * Nothing when the publisher keeps the design from their Stripe dashboard, so an
 * unconfigured site's session-create call stays exactly the one it made before this existed.
 */
export function stripeCheckoutBrandingOptions(
  design: StripeCheckoutDesign | null | undefined,
): StripeCheckoutBrandingOptions {
  if (!design) {
    return {};
  }
  return {
    branding_settings: {
      background_color: design.backgroundColor,
      button_color: design.buttonColor,
      border_style: design.borderStyle,
      font_family: design.fontFamily,
    },
  };
}
