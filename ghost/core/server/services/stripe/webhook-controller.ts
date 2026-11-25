import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { StripeTracking, WebhookOutcome } from './tracking';
import { classifyFailure, FAILURE_CODES } from './webhook/failures';
import {
  readEnvelope,
  toWebhookEvent,
  type StripeEventEnvelope,
  type WebhookEvent,
  type WebhookEventKind,
  type WebhookEvents,
} from './webhook/webhook-event';

export interface WebhookControllerDeps {
  /** The Stripe API version of Ghost's webhook endpoint, which Stripe formats events for. */
  apiVersion: string;
  /** This site's uuid, which tells the Checkout sessions it created from other sites'. */
  siteUuid(): string;
  webhookManager: {
    parseWebhook(body: unknown, signature: string): Promise<unknown>;
  };
  commands: WebhookCommands;
  tracking: Pick<StripeTracking, 'webhook'>;
  sentry: { captureException(err: unknown): unknown };
}

/** The command that handles each kind of webhook event, which takes the kind's input. */
type Commands = {
  [K in WebhookEventKind]: (input: WebhookEvents[K]) => Promise<WebhookOutcome>;
};

/**
 * The command for each kind of webhook event Ghost acts on, which `webhookCommands` builds with
 * each command's dependencies (see `webhook/commands.ts`). The controller ignores an `ignored`
 * event itself.
 */
export type WebhookCommands = Omit<Commands, 'ignored'>;

/** Runs the command for the event's kind. */
function run<K extends WebhookEventKind>(
  commands: Commands,
  event: WebhookEvent<K>,
): Promise<WebhookOutcome> {
  return commands[event.kind](event);
}

const WithStatus = z.object({ statusCode: z.number() });

/** The error Stripe's client throws when a signature doesn't verify, as `type` names its class. */
const SignatureVerificationError = z.object({
  type: z.literal('StripeSignatureVerificationError'),
});

/** The HTTP status for a failed event. Any status other than 2xx makes Stripe retry the event. */
function statusOf(err: unknown): number {
  const parsed = WithStatus.safeParse(err);
  return (parsed.success && parsed.data.statusCode) || 500;
}

/**
 * Ghost's Stripe webhook. It verifies that each request came from Stripe, parses the event into a
 * webhook event kind, runs the command for that kind, and responds to Stripe: 200 when Ghost
 * handled or ignored the event, or the error's status when it failed, which makes Stripe retry the
 * event later. The `stripe.webhook` span records each step (see `StripeTracking.webhook`).
 */
export class WebhookController {
  readonly #deps: WebhookControllerDeps;
  readonly #commands: Commands;
  #listedCustomers: ReadonlySet<string> = new Set();

  constructor(deps: WebhookControllerDeps) {
    this.#deps = deps;
    this.#commands = {
      ...deps.commands,
      ignored: async ({ reason }) => ({ result: 'ignored', reason }),
    };
  }

  /**
   * @param config.webhookCustomerIgnoreList Stripe customers whose subscription updates Ghost
   *   ignores, set by an operator.
   */
  configure({ webhookCustomerIgnoreList = [] }: { webhookCustomerIgnoreList?: string[] }): void {
    this.#listedCustomers = new Set(webhookCustomerIgnoreList.filter(Boolean));
  }

  async handle(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'];
    if (!req.body || typeof signature !== 'string' || !signature) {
      res.writeHead(400);
      res.end();
      return;
    }
    try {
      await this.#deps.tracking.webhook(async (attempt) => {
        const verified = await this.#verify(req.body, signature);
        const envelope = readEnvelope(verified);
        attempt.receiving(envelope.type);
        // Before the event is parsed into its kind, so a mismatch is still logged when it's the
        // reason the event doesn't parse.
        this.#checkApiVersion(envelope);
        const event = toWebhookEvent(envelope.type, verified, {
          siteUuid: this.#deps.siteUuid(),
          listedCustomers: this.#listedCustomers,
        });
        attempt.matching(event.kind);
        logging.info(
          {
            event: { name: 'stripe.webhook.received' },
            stripe_event_type: envelope.type,
            stripe_event_id: envelope.id,
          },
          'Handling a Stripe webhook',
        );
        if (event.kind === 'ignored' && event.reason === 'listed_customer') {
          logging.info(
            {
              event: { name: 'stripe.webhook.ignored' },
              stripe_event_type: envelope.type,
              customer_id: event.customerId,
            },
            'Ignored a Stripe webhook for a customer on stripeWebhookCustomerIgnoreList',
          );
        }
        return run(this.#commands, event);
      });
      res.writeHead(200);
      res.end();
    } catch (err) {
      // The span has already recorded the failure and logged the error. Only failures whose reason
      // is set to report go to Sentry, and Ghost's Sentry setup also drops every Ghost error whose
      // status isn't 500.
      if (classifyFailure(err).sentry) {
        this.#deps.sentry.captureException(err);
      }
      res.writeHead(statusOf(err));
      res.end();
    }
  }

  /** Returns the event in `body` after verifying its signature with the site's webhook secret. */
  async #verify(body: unknown, signature: string): Promise<unknown> {
    try {
      return await this.#deps.webhookManager.parseWebhook(body, signature);
    } catch (err) {
      if (classifyFailure(err).reason === 'webhook_secret_missing') {
        throw err;
      }
      // Only a signature that doesn't verify is the site's setup. Anything else that stops the
      // check, such as Ghost clearing its Stripe client while disconnecting, stays Ghost's.
      const mismatched = SignatureVerificationError.safeParse(err).success;
      throw new errors.UnauthorizedError({
        ...(err instanceof Error ? { err } : {}),
        ...(mismatched ? { code: FAILURE_CODES.signatureMismatch } : {}),
        message: mismatched
          ? "The webhook's signature doesn't show that Stripe sent it to this site."
          : "Ghost couldn't check the webhook's signature.",
      });
    }
  }

  /**
   * Stripe formats each event for the API version of the endpoint it was sent to. A different
   * version means the event didn't come through the endpoint Ghost registered, so fields may not be
   * where Ghost expects them.
   */
  #checkApiVersion(envelope: StripeEventEnvelope): void {
    if (envelope.api_version !== this.#deps.apiVersion) {
      logging.error(
        {
          event: { name: 'stripe.webhook.api_version_mismatch' },
          stripe_event_type: envelope.type,
          api_version: envelope.api_version,
          expected_api_version: this.#deps.apiVersion,
        },
        'Stripe sent a webhook rendered at a different API version than Ghost expects',
      );
    }
  }
}
