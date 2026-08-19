import logging from '@tryghost/logging';
import {MAX_CHECKOUT_CUSTOM_FIELDS, MAX_CHECKOUT_LABEL_LENGTH} from './field-ports';
import type {ResolvedCheckout, ResolvedQuestion} from '../../../tier-checkout-config';

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
 * instead — a missing question costs one answer, and a rejected session costs the sale.
 *
 * `customer_update` is deliberately never set. It is only valid alongside `customer`, and
 * setting it without one is the exact reproduction of the incident that took the automatic
 * tax beta down. Nothing here needs it: the shipping address is read off the completed
 * session, not off the customer.
 */

export interface StripeCheckoutCollectionOptions {
    custom_fields?: Array<{
        key: string;
        label: {type: 'custom'; custom: string};
        type: 'text';
        optional: boolean;
    }>;
    shipping_address_collection?: {allowed_countries: string[]};
    tax_id_collection?: {enabled: true};
    phone_number_collection?: {enabled: true};
}

/** Our field types as Stripe's input types. Anything absent cannot be asked at checkout. */
const QUESTION_TYPES: Record<string, 'text'> = {
    short_text: 'text'
};

function askable(question: ResolvedQuestion): boolean {
    if (!QUESTION_TYPES[question.type]) {
        logging.warn({
            event: {name: 'stripe.checkout.question_skipped'},
            custom_field_key: question.key,
            field_type: question.type,
            reason: 'unsupported_type'
        }, 'Skipping a Stripe checkout question');
        return false;
    }
    if (question.prompt.length > MAX_CHECKOUT_LABEL_LENGTH) {
        logging.warn({
            event: {name: 'stripe.checkout.question_skipped'},
            custom_field_key: question.key,
            prompt_length: question.prompt.length,
            reason: 'label_too_long'
        }, 'Skipping a Stripe checkout question');
        return false;
    }
    return true;
}

/**
 * Build the collection parameters for a checkout, or nothing at all.
 *
 * Returns an object with no keys when a tier asks for nothing, so a caller can spread it
 * over its session options unconditionally and change nothing.
 */
export function stripeCheckoutCollectionOptions(checkout: ResolvedCheckout | undefined): StripeCheckoutCollectionOptions {
    const options: StripeCheckoutCollectionOptions = {};
    if (!checkout) {
        return options;
    }

    const questions = checkout.customFields.filter(askable).slice(0, MAX_CHECKOUT_CUSTOM_FIELDS);
    if (questions.length < checkout.customFields.length) {
        logging.warn({
            event: {name: 'stripe.checkout.questions_trimmed'},
            asked: questions.length,
            configured: checkout.customFields.length
        }, 'Some Stripe checkout questions were not asked');
    }

    if (questions.length > 0) {
        options.custom_fields = questions.map(question => ({
            // Our own key on both legs: the answer comes back under it, so reading it is a
            // lookup rather than a mapping.
            key: question.key,
            label: {type: 'custom' as const, custom: question.prompt},
            type: QUESTION_TYPES[question.type],
            optional: question.optional
        }));
    }

    // Written out one at a time rather than looped over a map. Each of these becomes a
    // different Stripe parameter with a different shape, and only one of them can be
    // configured in a way Stripe would reject.
    if (checkout.shipping) {
        // The country list is what makes this reach Stripe at all. An empty
        // `shipping_address_collection` form-encodes to nothing, so a request built that
        // way carries no parameter and Stripe accepts it precisely because it was never
        // asked to collect anything — which reads as success and collects no addresses.
        //
        // Defended again here rather than trusted from the settings screen: this is the
        // checkout path, and a malformed configuration must cost the collection rather than
        // throw inside a session build.
        if (checkout.shipping.allowedCountries.length === 0) {
            logging.warn({
                event: {name: 'stripe.checkout.collection_skipped'},
                port: 'shipping_address',
                reason: 'no_allowed_countries'
            }, 'Skipping a Stripe checkout collection');
        } else {
            options.shipping_address_collection = {allowed_countries: checkout.shipping.allowedCountries};
        }
    }

    // Unioned with whatever automatic tax asks for. Both want the same thing, so a site
    // running the 2024 tax beta keeps collecting and a site that asked for it starts.
    if (checkout.taxNumber) {
        options.tax_id_collection = {enabled: true};
    }

    if (checkout.phone) {
        options.phone_number_collection = {enabled: true};
    }

    return options;
}
