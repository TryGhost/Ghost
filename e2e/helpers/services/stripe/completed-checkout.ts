import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {RecordedStripeCheckoutSession, StripeEvent} from './builders';

/**
 * Completing a checkout the way Stripe completes one.
 *
 * ## Why this reads a fixture instead of building an object
 *
 * The completed session is the only Stripe payload Ghost reads publisher data out of,
 * and its shape is version-dependent in a way nothing in the payload would warn us
 * about — at our pinned API version the address is `shipping`, and later versions move
 * it to `collected_information.shipping_details`. A hand-built event would let a test
 * pass against a shape Stripe stopped sending, which is the failure this whole fixture
 * suite exists to prevent. So the event is a real captured session with the parts a
 * test cares about substituted in, and `drift.test.ts` keeps the capture honest.
 *
 * ## Why it reads the request too
 *
 * A member can only answer a question the checkout page asked. Building the completion
 * from the session Ghost actually created means a test cannot answer a question that
 * was never rendered, or supply an address for a checkout that never asked for one —
 * both of which would otherwise pass while proving nothing. Those are errors here,
 * named, rather than silently accepted.
 */

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function capturedSession(): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.resolve(fixtureDir, 'checkout_session.completed.json'), 'utf8'));
}

/** An address as a member would type it on the checkout page. */
export interface CheckoutShippingInput {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}

/** What a member filled in on the checkout page. Everything is optional; nothing is invented. */
export interface CollectedCheckoutInput {
    /** Answers to the publisher's questions, keyed by the custom field key Ghost asked under. */
    answers?: Record<string, string>;
    /**
     * The delivery address. Omitted, a checkout that asked for one gets the captured
     * fixture's address, so a test that does not care about the values stays short.
     * `null` is a checkout that asked and collected nothing.
     */
    shipping?: CheckoutShippingInput | null;
    taxId?: string | null;
    phone?: string | null;
}

function askedQuestions(session: RecordedStripeCheckoutSession): string[] {
    const asked = (session.request as {custom_fields?: Array<{key: string}>}).custom_fields ?? [];
    return asked.map(field => field.key);
}

function asks(session: RecordedStripeCheckoutSession, parameter: string): boolean {
    return (session.request as Record<string, unknown>)[parameter] !== undefined;
}

/**
 * The `custom_fields` a completed session carries: every question the page asked, each
 * holding the answer a test says the member gave, or none.
 *
 * Built from the request rather than from the answers, because that is the direction the
 * real thing works in — Stripe returns every field it rendered, answered or not.
 */
function answeredQuestions(session: RecordedStripeCheckoutSession, answers: Record<string, string>) {
    const asked = askedQuestions(session);

    for (const key of Object.keys(answers)) {
        if (!asked.includes(key)) {
            throw new Error(
                `The checkout never asked for "${key}", so a member could not have answered it. ` +
                `It asked for: ${asked.length > 0 ? asked.join(', ') : 'nothing'}.`
            );
        }
    }

    const requested = (session.request as {custom_fields?: Array<{key: string; label?: {custom?: string}; optional?: boolean}>}).custom_fields ?? [];
    return requested.map(field => ({
        key: field.key,
        type: 'text',
        optional: field.optional ?? true,
        label: {type: 'custom', custom: field.label?.custom ?? field.key},
        // Stripe returns the whole `text` object whether or not it was filled in.
        text: {
            value: answers[field.key] ?? null,
            default_value: null,
            maximum_length: null,
            minimum_length: null
        }
    }));
}

function shippingBlock(session: RecordedStripeCheckoutSession, given: CollectedCheckoutInput['shipping'], captured: Record<string, unknown>) {
    const collecting = asks(session, 'shipping_address_collection');

    if (given !== undefined && given !== null && !collecting) {
        throw new Error('The checkout never asked for a shipping address, so a member could not have given one.');
    }
    if (!collecting || given === null) {
        return null;
    }
    if (given === undefined) {
        return captured.shipping;
    }

    const {name, ...address} = given;
    const capturedShipping = captured.shipping as {address: Record<string, unknown>};
    return {
        name: name ?? null,
        // Every part Stripe returns is present, and one the test left out comes back null
        // rather than absent — which is what makes "an address with holes in it" testable.
        address: Object.fromEntries(
            Object.keys(capturedShipping.address).map(part => [part, address[part as keyof typeof address] ?? null])
        ),
        carrier: null,
        phone: null,
        tracking_number: null
    };
}

/**
 * A `checkout.session.completed` event for a session Ghost created, carrying what a
 * member filled in on the page.
 */
export function buildCollectedCheckoutCompletedEvent(opts: {
    session: RecordedStripeCheckoutSession;
    customerId: string;
    collected?: CollectedCheckoutInput;
}): StripeEvent {
    const {session, customerId, collected = {}} = opts;
    const captured = capturedSession();

    if (collected.taxId && !asks(session, 'tax_id_collection')) {
        throw new Error('The checkout never asked for a tax number, so a member could not have given one.');
    }
    if (collected.phone && !asks(session, 'phone_number_collection')) {
        throw new Error('The checkout never asked for a phone number, so a member could not have given one.');
    }

    const customerDetails = captured.customer_details as Record<string, unknown>;

    return {
        id: `evt_${session.response.id}`,
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                ...captured,
                id: session.response.id,
                mode: 'subscription',
                customer: customerId,
                metadata: {checkoutType: 'signup', ...session.response.metadata},
                custom_fields: answeredQuestions(session, collected.answers ?? {}),
                shipping: shippingBlock(session, collected.shipping, captured),
                customer_details: {
                    ...customerDetails,
                    phone: collected.phone ?? null,
                    // A typed pair, of which only the value ever crosses into a field.
                    tax_ids: collected.taxId ? [{type: 'gb_vat', value: collected.taxId}] : []
                }
            }
        }
    };
}
