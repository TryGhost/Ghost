import type Stripe from 'stripe';
import { COLLECTED_PARTS, portsOf, type CollectedPart } from '@tryghost/checkout';
import type { Meter } from '../../lib/tracing/meter';
import type { Span, Tracer } from '../../lib/tracing/tracer';
import { SECTION_OF } from '../stripe-checkout-config/models';
import type { CollectedPhone } from './services/checkout/completed-session';
import {
  CHECKOUT_PARTS,
  type CheckoutPart,
  type CheckoutSessionParts,
  partName,
  type Refusal,
} from './checkout-session-params';
import { classifyFailure } from './webhook/failures';
import type { WebhookEventKind } from './webhook/webhook-event';

// The spans and counts that record how buyers' Stripe Checkouts go, and how Ghost handles what
// Stripe sends it. Their names and attributes are defined here, in one place, because the Stripe
// Checkout dashboard in TryGhost/k8s queries them by name: renaming one or an attribute breaks the
// dashboard until it's changed to match.
//
// Several parts of Ghost record the spans. The members API's router records a
// `stripe_checkout.start` span for each checkout a buyer starts, and `StripeAPI` records a
// `stripe_checkout.session` span for each Checkout session it asks Stripe to create. The webhook
// controller records a `stripe.webhook` span for each event Stripe sends, and the checkout webhook
// records a `stripe_checkout.complete` span for each checkout a buyer completes. None of them
// touches its span. Each is handed an attempt object and reports to it what happened, in terms of
// the checkout, and the functions below decide how each report is recorded on the span. The
// checkout webhook also counts each phone number a completed checkout collects, as
// `stripe_checkout.collected_phones`.

type CheckoutType = 'subscription' | 'donation' | 'gift';

/**
 * A completed checkout's kind: one a buyer starts, or `setup`, which saves a member's new card for
 * their subscription.
 */
type CompletedCheckoutType = CheckoutType | 'setup';

/** What a checkout knows of its buyer: whether they're already a member, and whether they proved it. */
interface BuyerReport {
  existing: boolean;
  verified: boolean;
}

/**
 * Who a checkout's buyer is to the site:
 *
 * - `new`: not a member yet.
 * - `signed_in`: a member who signed in before starting the checkout, such as a free member
 *   upgrading.
 * - `unverified`: a member by the email address typed into the checkout, which doesn't prove the
 *   buyer owns it, so the checkout saves what it collected into custom fields but can't change
 *   the member's name.
 */
type Buyer = 'new' | 'signed_in' | 'unverified';

function buyerOf({ existing, verified }: BuyerReport): Buyer {
  if (!existing) {
    return 'new';
  }
  return verified ? 'signed_in' : 'unverified';
}

/** What the members API reports to a `stripe_checkout.start` span while it starts a checkout. */
interface CheckoutAttempt {
  /** Called once the members API knows Ghost offers the kind of checkout the buyer asked for. */
  starting(type: CheckoutType): void;
  /** Called once the members API has looked the buyer up. */
  buying(buyer: BuyerReport): void;
}

/** What `StripeAPI` reports to a `stripe_checkout.session` span while it creates a session. */
interface CheckoutSessionAttempt {
  /**
   * Called each time Stripe rejects the request for a session because of the parts of the
   * checkout in `refusal`, just before Ghost sends the request again without those parts.
   */
  refused(refusal: Refusal): void;
}

/**
 * What happened to one part of a checkout while Ghost created its Checkout session. A checkout's
 * parts are its design and each thing the publisher has it ask the buyer for, such as a phone
 * number.
 *
 * - `applied`: the last request Ghost sent Stripe for the session included the part.
 * - `none`: the publisher hasn't set the part up, so no request included it.
 * - `refused`: Stripe rejected a request and named the part's parameter as the reason, so Ghost
 *   sent the request again without the part.
 * - `dropped`: Stripe rejected a request without naming a parameter, so Ghost couldn't tell which
 *   part was the reason and sent the request again without any of them.
 */
type PartOutcome = 'applied' | 'none' | 'refused' | 'dropped';

/**
 * What became of what a completed checkout asked the buyer for, one collected part at a time:
 *
 * - `none`: the checkout didn't ask for the part, or Ghost doesn't save what checkouts collect.
 * - `saved`: each of the part's answers was saved into its custom field.
 * - `partly_saved`: some of the part's answers were saved, and the rest had no field to go to.
 * - `no_destination`: none of the part's answers had a field to go to, as collection was switched
 *   off, or the part's fields archived or deleted, while the checkout was open.
 * - `refused`: a custom field refused one of the part's answers, such as a wallet's phone number
 *   that no country the checkout knew could read.
 * - `failed`: saving what the checkout collected failed.
 */
type CollectedPartOutcome =
  | 'none'
  | 'saved'
  | 'partly_saved'
  | 'no_destination'
  | 'refused'
  | 'failed';

/** What the checkout webhook reports to a `stripe_checkout.complete` span while it completes one. */
export interface CheckoutCompletionAttempt {
  /** Called once the webhook knows which kind of checkout completed. */
  completing(type: CompletedCheckoutType): void;
  /** Called once the webhook has looked the buyer up. */
  buying(buyer: BuyerReport): void;
  /** Called with what the checkout asked the buyer for and got back, by port, before any is saved. */
  collecting(answers: readonly { port: string }[]): void;
  /**
   * Called once Ghost has worked out what it can save of what the checkout collected: `kept` are
   * the ports with a custom field to go to, and `refused` what those fields refused, each named by
   * its port or a part of the port's value, such as `checkout.shipping.address.country`.
   */
  saving(plan: { kept: ReadonlySet<string>; refused: readonly { property: string }[] }): void;
  /** Called when saving what the checkout collected fails. */
  failing(): void;
}

/** What the webhook controller reports to a `stripe.webhook` span while it handles an event. */
interface WebhookAttempt {
  /** Called once Ghost has checked the event came from Stripe, with its type, such as `invoice.payment_succeeded`. */
  receiving(type: string): void;
  /** Called with the event's kind once Ghost has parsed it. The kind selects the command. */
  matching(kind: WebhookEventKind): void;
}

/**
 * Why the webhook ignored a verified event: `listed_customer` when its customer is in the
 * `stripeWebhookCustomerIgnoreList` config, or `unhandled_type` when Ghost has no command for its
 * type.
 */
export type IgnoreReason = 'listed_customer' | 'unhandled_type';

/** What the webhook did with a verified event. */
export type WebhookOutcome = { result: 'handled' } | { result: 'ignored'; reason: IgnoreReason };

/**
 * Runs `operation`. If it throws, records the failure's reason and owner on `span` (see
 * `classifyFailure`), then rethrows the error.
 */
async function recordingFailure<Result>(
  span: Span,
  operation: () => Promise<Result>,
): Promise<Result> {
  try {
    return await operation();
  } catch (err) {
    const { reason, owner } = classifyFailure(err);
    span.setAttribute('result', 'failed');
    span.setAttribute('reason', reason);
    span.setAttribute('owner', owner);
    throw err;
  }
}

/** A collected part's name on a span, the same name the `stripe_checkout.session` span gives it. */
const collectedPartName = (part: CollectedPart) => partName(SECTION_OF[part]);

/**
 * What became of a part's answers, from the ports Ghost had answers for, the ports with a field to
 * go to, and what those fields refused.
 */
function collectedOutcome(
  ports: readonly string[],
  { kept, refused }: { kept: ReadonlySet<string>; refused: readonly { property: string }[] },
): CollectedPartOutcome {
  const refusedFor = (port: string) =>
    refused.some(({ property }) => property === port || property.startsWith(`${port}.`));
  if (ports.some(refusedFor)) {
    return 'refused';
  }
  const saved = ports.filter((port) => kept.has(port)).length;
  if (saved === ports.length) {
    return 'saved';
  }
  return saved === 0 ? 'no_destination' : 'partly_saved';
}

/**
 * What became of the phone number a completed checkout collected:
 *
 * - `saved`: its custom field kept it.
 * - `refused`: its field refused it, such as a wallet's number without its country code that no
 *   country the checkout knew could read.
 * - `no_destination`: no field takes it now, as collection was switched off or its field deleted
 *   while the checkout was open.
 */
export type CollectedPhoneOutcome = 'saved' | 'refused' | 'no_destination';

/**
 * The wallet a buyer paid with, as Stripe names it, such as `apple_pay`: `none` for a card or
 * another method, and `unknown` when the checkout's subscription couldn't be found to tell.
 */
export type CheckoutWallet = Stripe.PaymentMethod.Card.Wallet.Type | 'none' | 'unknown';

export type StripeTracking = ReturnType<typeof stripeTracking>;

export function stripeTracking({ tracer, meter }: { tracer: Tracer; meter: Meter }) {
  const collectedPhones = meter.createCounter('stripe_checkout.collected_phones');
  return {
    /**
     * Records one `stripe_checkout.start` span for each request a buyer makes to start a
     * checkout. The span runs from the checkout endpoint starting on the request to the endpoint
     * answering with the Checkout link, so the span sees every failure that stops a checkout,
     * including those that happen before Ghost asks Stripe for a session, which the
     * `stripe_checkout.session` span never sees. The endpoint starts once the request's JSON body
     * has been parsed and the rate limits checked, so a request turned away before then, such as
     * one whose body isn't JSON, isn't a checkout and records no span.
     *
     * When Ghost refuses the request, the span fails with the refusal's error type, such as
     * `BadRequestError` for a tier that doesn't exist, so the dashboard can count refusals
     * separately from failures. The `type` attribute holds the kind of checkout. A request for a
     * kind Ghost doesn't offer is refused before `type` is set, so its span has no `type`. The
     * `member` attribute says who the buyer is to the site (see `Buyer`), so subscription
     * checkouts started can be set against those completed, for each kind of buyer.
     */
    checkout<Result>(start: (attempt: CheckoutAttempt) => Promise<Result>): Promise<Result> {
      return tracer.track('stripe_checkout.start', (span) =>
        start({
          starting: (type) => span.setAttribute('type', type),
          buying: (buyer) => span.setAttribute('member', buyerOf(buyer)),
        }),
      );
    },

    /**
     * Records one `stripe_checkout.complete` span for each checkout event Stripe sends Ghost, from
     * the webhook starting on the event to Ghost having done everything a completed checkout asks
     * of it, such as making the buyer a paid member. The span fails when that fails, which fails
     * the webhook, so Stripe sends the event again later.
     *
     * The `type` attribute holds the kind of checkout once Ghost completes it. An event that
     * completes nothing has no `type`, such as a failed asynchronous payment, or a gift whose
     * payment hasn't arrived yet, which gets a span with `type` when it does. So completed
     * checkouts are the spans with a `type`. The `member` attribute says who the buyer is to the
     * site (see `Buyer`), for a subscription.
     *
     * Each collected part has an attribute saying what became of what the checkout asked for (see
     * `CollectedPartOutcome`). Saving what a checkout collected never fails the span: the money is
     * already taken, so a failed save is recorded on the part rather than sending the event again.
     * A completion that fails before Ghost reads what the checkout collected leaves every part
     * `none`. A failed completion also records `result: failed`, a `reason` and an `owner`, the
     * same as the `stripe.webhook` span.
     */
    checkoutCompletion<Result>(
      complete: (attempt: CheckoutCompletionAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track('stripe_checkout.complete', (span) => {
        const record = (part: CollectedPart, outcome: CollectedPartOutcome) =>
          span.setAttribute(collectedPartName(part), outcome);
        for (const part of COLLECTED_PARTS) {
          record(part, 'none');
        }
        // The ports each part had answers for, once the checkout says what it collected.
        let asked: [CollectedPart, string[]][] = [];
        return recordingFailure(span, () =>
          complete({
            completing: (type) => span.setAttribute('type', type),
            buying: (buyer) => span.setAttribute('member', buyerOf(buyer)),
            collecting(answers) {
              asked = COLLECTED_PARTS.map((part): [CollectedPart, string[]] => [
                part,
                portsOf(part).filter((port) => answers.some((answer) => answer.port === port)),
              ]).filter(([, ports]) => ports.length > 0);
            },
            saving(plan) {
              asked.forEach(([part, ports]) => record(part, collectedOutcome(ports, plan)));
            },
            failing() {
              asked.forEach(([part]) => record(part, 'failed'));
            },
          }),
        );
      });
    },

    /**
     * Records one `stripe.webhook` span for each event Stripe sends to Ghost's webhook, from when
     * the webhook receives the request until Ghost responds to Stripe. The span fails when Ghost
     * responds with an error status, which makes Stripe retry the event later, including when the
     * signature check fails. A request with no body or no signature isn't from Stripe, so it
     * records no span.
     *
     * The `type` attribute holds the event's type, such as `checkout.session.completed`, and
     * `kind` the webhook event kind, which selects the command that handles it. `result` is
     * `handled`, `ignored` or `failed`. Ignored and failed events also have a `reason`, and failed
     * events an `owner`: who can fix the failure (see `classifyFailure`). The objectives filter on
     * `owner`.
     */
    webhook(handle: (attempt: WebhookAttempt) => Promise<WebhookOutcome>): Promise<WebhookOutcome> {
      return tracer.track('stripe.webhook', (span) =>
        recordingFailure(span, async () => {
          const outcome = await handle({
            receiving: (type) => span.setAttribute('type', type),
            matching: (kind) => span.setAttribute('kind', kind),
          });
          for (const [key, value] of Object.entries(outcome)) {
            span.setAttribute(key, value);
          }
          return outcome;
        }),
      );
    },

    /**
     * Records one `stripe_checkout.session` span for each Checkout session Ghost asks Stripe to
     * create for a buyer, with one attribute per part of the checkout saying what happened to
     * that part (see `PartOutcome`).
     *
     * When Stripe fails the session, the span's attributes describe the last request Ghost sent,
     * which is the one that failed. A part that is still `applied` was in that request, so
     * Stripe failed the request for a reason other than refusing that part. When no part is
     * `applied`, the failed request carried none of the publisher's checkout settings, so those
     * settings weren't the reason it failed.
     */
    checkoutSession<Session>(
      parts: CheckoutSessionParts,
      create: (attempt: CheckoutSessionAttempt) => Promise<Session>,
    ): Promise<Session> {
      return tracer.track('stripe_checkout.session', (span) => {
        const record = (part: CheckoutPart, outcome: PartOutcome) =>
          span.setAttribute(partName(part), outcome);
        for (const part of CHECKOUT_PARTS) {
          record(part, parts[part] ? 'applied' : 'none');
        }
        return create({
          refused(refusal) {
            if (refusal.named) {
              record(refusal.part, 'refused');
            } else {
              refusal.parts.forEach((part) => record(part, 'dropped'));
            }
          },
        });
      });
    },

    /**
     * Counts one `stripe_checkout.collected_phones` for each phone number a completed checkout
     * collects and Ghost goes to save. `wallet` says how often buyers pay with Apple Pay or Google
     * Pay, which pass a number on as the wallet keeps it rather than in E.164. `phone_form`,
     * `phone_country` and `phone_outcome` say how often such a number needs a country to be read,
     * whether the checkout knew one, and whether its field kept it. The number itself is never
     * recorded, as it is the buyer's.
     */
    collectedPhone({
      wallet,
      phone,
      outcome,
    }: {
      wallet: CheckoutWallet;
      phone: CollectedPhone;
      outcome: CollectedPhoneOutcome;
    }): void {
      collectedPhones.add(1, {
        wallet,
        phone_form: phone.form,
        phone_country: phone.country,
        phone_outcome: outcome,
      });
    },
  };
}
