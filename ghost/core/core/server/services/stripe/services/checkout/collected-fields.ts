import logging from '@tryghost/logging';
import type {StripePort} from './field-ports';

/**
 * Reading what Stripe collected off a completed checkout session, and writing it into the
 * publisher's fields.
 *
 * ## Two halves, one write
 *
 * The questions come back under the keys Ghost sent, so reading one is a lookup by our own
 * key. The ports come back under Stripe's own vocabulary and have to be resolved through a
 * binding first. Both end up as the same thing — a field key and a value — so they are
 * written together, in one transaction, under one source.
 *
 * ## Nothing here may be fatal
 *
 * This runs inside the webhook that creates the member and links the subscription. A throw
 * would fail the webhook, which makes Stripe retry it, which risks doing the payment work
 * twice — all to save a value the member gave us for free. So every failure is logged and
 * dropped, and each field is planned on its own so a single bad value costs one field
 * rather than all of them.
 *
 * ## What is dropped rather than written
 *
 * An absent or empty part is left out entirely rather than written as empty. Empty is how
 * a write says "clear this", and a checkout that did not collect a postcode must not erase
 * the postcode someone typed into admin last week.
 *
 * ## The API version this reads
 *
 * `shipping` is where the address lives at Ghost's pinned Stripe API version. Later
 * versions moved it to `collected_information.shipping_details`, and an Event is an
 * immutable snapshot rendered at the account's version — so nothing in a payload would
 * warn us if that pin ever changed. `tax_ids` carries a typed pair and only the value
 * crosses: letting `gb_vat` into a publisher's field would put Stripe's vocabulary into
 * data that outlives Stripe.
 */

/** Only what this needs off a session, so the pinned SDK's missing types are not in the way. */
interface CompletedSession {
    custom_fields?: Array<{key?: string; text?: {value?: string | null} | null} | null> | null;
    shipping?: {
        name?: string | null;
        address?: Record<string, string | null | undefined> | null;
    } | null;
    customer_details?: {
        phone?: string | null;
        tax_ids?: Array<{value?: string | null} | null> | null;
    } | null;
}

/** A field key and what to put in it. */
export interface CollectedValue {
    key: string;
    value: unknown;
    /** The binding that routed it, recorded on the value as its writer. */
    bindingId: string;
}

/** The collaborators this needs, as it needs them. */
export interface CollectedFieldsDeps {
    resolvePort(port: string): Promise<{bindingId: string; key: string} | null>;
    planWrite(values: Record<string, unknown>): Promise<unknown[]>;
    /** `bindingId` is what the written values record as their writer. */
    applyWrite(memberId: string, plan: unknown[], bindingId: string): Promise<void>;
}

function text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * The address a session collected, as our address type takes it, or nothing.
 *
 * Stripe's address parts are exactly ours, so this is a rename of one key and a drop of
 * everything empty — no transformation, and no part invented. The recipient name sits
 * beside the address on Stripe's side and inside it on ours.
 */
function shippingValue(session: CompletedSession): Record<string, string> | undefined {
    const shipping = session.shipping;
    if (!shipping) {
        return undefined;
    }

    // The recipient's name is beside the address here and kept apart from it on our side,
    // so it travels through its own port rather than being folded in.
    const value: Record<string, string> = {};
    for (const [part, given] of Object.entries(shipping.address ?? {})) {
        const collected = text(given);
        if (collected) {
            value[part] = collected;
        }
    }

    // Our address type needs at least one part, and a session that collected nothing has
    // nothing to say about the address a member may already have.
    return Object.keys(value).length > 0 ? value : undefined;
}

/** What each Stripe port carries on a completed session. */
const PORT_VALUES: Record<StripePort, (session: CompletedSession) => unknown> = {
    shipping_name: session => text(session.shipping?.name),
    shipping_address: shippingValue,
    tax_number: session => text(session.customer_details?.tax_ids?.[0]?.value),
    phone: session => text(session.customer_details?.phone)
};

/**
 * Everything a session collected, as field keys and values.
 *
 * A question whose field is no longer active is dropped rather than refused: the write path
 * would reject an unknown key and take the whole write down with it, and a publisher who
 * archived a field mid-checkout has already said they do not want it.
 */
export async function collectedValues(session: CompletedSession, deps: CollectedFieldsDeps): Promise<CollectedValue[]> {
    const collected: CollectedValue[] = [];

    // Everything routes through a binding, answers included: a question is asked under its
    // port and the binding says where that answer lands. So one loop covers both, and every
    // value carries the binding that routed it — which is the whole of its provenance.
    const answers = (session.custom_fields ?? [])
        .map(field => ({port: field?.key, value: text(field?.text?.value)}))
        .filter((answer): answer is {port: string; value: string} => Boolean(answer.port && answer.value));

    const collectedByPort = Object.entries(PORT_VALUES)
        .map(([port, read]) => ({port, value: read(session)}))
        .filter(entry => entry.value !== undefined);

    for (const {port, value} of [...answers, ...collectedByPort]) {
        const destination = await deps.resolvePort(port);
        // Nothing bound, or bound to a field since archived. Both mean there is nowhere to
        // put this, which is not an error — it is a publisher who has not asked for it.
        if (!destination) {
            continue;
        }
        collected.push({key: destination.key, value, bindingId: destination.bindingId});
    }

    return collected;
}

/**
 * Write what a session collected onto a member.
 *
 * Never throws. Each value is planned on its own, so one that fails validation — an
 * over-long postcode, a country code Stripe formats differently — costs that field and
 * leaves the rest.
 */
export async function writeCollectedFields(memberId: string, session: CompletedSession, deps: CollectedFieldsDeps): Promise<void> {
    let collected: CollectedValue[];
    try {
        collected = await collectedValues(session, deps);
    } catch (err) {
        logging.error(err);
        return;
    }

    // Grouped by binding, because provenance differs per value and a write states one
    // writer. A handful of bindings at most, so this is a handful of writes.
    const byBinding = new Map<string, unknown[]>();
    for (const {key, value, bindingId} of collected) {
        try {
            const planned = await deps.planWrite({[key]: value});
            byBinding.set(bindingId, [...(byBinding.get(bindingId) ?? []), ...planned]);
        } catch (err) {
            logging.warn({
                event: {name: 'stripe.checkout.value_rejected'},
                custom_field_key: key,
                reason: err instanceof Error ? err.message : String(err)
            }, 'A value collected at checkout could not be saved');
        }
    }

    if (byBinding.size === 0) {
        return;
    }

    for (const [bindingId, plan] of byBinding) {
        try {
            await deps.applyWrite(memberId, plan, bindingId);
        } catch (err) {
            // One binding's write failing costs that binding's values and no others: a
            // member who gave us an address and a t-shirt size keeps whichever landed.
            logging.error(err);
        }
    }
}
