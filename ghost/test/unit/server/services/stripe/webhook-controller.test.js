const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const Stripe = require('stripe');
const logging = require('@tryghost/logging');
const {
  WebhookController,
} = require('../../../../../core/server/services/stripe/webhook-controller');
const { createTracer } = require('../../../../../core/server/lib/tracing/create-tracer');
const { createMeter } = require('../../../../../core/server/lib/tracing/create-meter');
const { stripeTracking } = require('../../../../../core/server/services/stripe/tracking');
const {
  classifyFailure,
  FAILURE_CODES,
} = require('../../../../../core/server/services/stripe/webhook/failures');

const shipNothing = { transport: { metric: async () => null }, logging: { error() {} } };
const tracking = stripeTracking({
  tracer: createTracer(shipNothing),
  meter: createMeter(shipNothing),
});

// What the end-to-end tests in `stripe-webhook-outcomes.test.ts` can't see: which failures go to
// Sentry, and the log line for an event at another Stripe API version.
describe('WebhookController', function () {
  let controller;
  let deps;
  let req;
  let res;

  beforeEach(function () {
    deps = {
      apiVersion: '2020-08-27',
      subscriptionEventService: { handleSubscriptionEvent: sinon.stub() },
      invoiceEventService: { handleInvoiceEvent: sinon.stub() },
      checkoutSessionEventService: { handleEvent: sinon.stub(), handleDonationEvent: sinon.stub() },
      chargeRefundedEventService: { handleEvent: sinon.stub() },
      webhookManager: { parseWebhook: sinon.stub() },
      tracking,
      sentry: { captureException: sinon.stub() },
    };

    controller = new WebhookController(deps);

    req = {
      body: {},
      headers: {
        'stripe-signature': 'valid-signature',
      },
    };

    res = {
      writeHead: sinon.stub(),
      end: sinon.stub(),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it.each([
    ['body', () => delete req.body],
    ['signature header', () => delete req.headers['stripe-signature']],
  ])('responds with 400 without checking a request that has no %s', async function (_name, remove) {
    remove();

    await controller.handle(req, res);

    sinon.assert.calledOnceWithExactly(res.writeHead, 400);
    sinon.assert.notCalled(deps.webhookManager.parseWebhook);
  });

  it('logs an error for an event rendered at a different API version and still handles it', async function () {
    sinon.stub(logging, 'error');
    deps.webhookManager.parseWebhook.resolves({
      type: 'charge.refunded',
      api_version: '2025-08-27.basil',
      data: { object: { id: 'ch_1' } },
    });

    await controller.handle(req, res);

    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'stripe.webhook.api_version_mismatch' },
      api_version: '2025-08-27.basil',
      expected_api_version: '2020-08-27',
    });
    sinon.assert.calledOnce(deps.chargeRefundedEventService.handleEvent);
    sinon.assert.calledWith(res.writeHead, 200);
  });

  it('does not log a version error for an event at the pinned API version', async function () {
    sinon.stub(logging, 'error');
    deps.webhookManager.parseWebhook.resolves({
      type: 'charge.refunded',
      api_version: '2020-08-27',
      data: { object: { id: 'ch_1' } },
    });

    await controller.handle(req, res);

    sinon.assert.notCalled(logging.error);
  });

  /** A subscription event whose handler fails with `failure`, which it returns. */
  function failingWith(failure) {
    deps.webhookManager.parseWebhook.resolves({
      type: 'customer.subscription.created',
      data: { object: { customer: 'cust_123' } },
    });
    deps.subscriptionEventService.handleSubscriptionEvent.throws(failure);
    return failure;
  }

  // One failure for each reason a failed event can have: the status Ghost responds with, and
  // whether it reports the failure to Sentry. `fail` sets the failure up, and returns the error
  // when it's the handler that throws it.
  const failures = [
    {
      name: 'unclassified',
      reason: 'unclassified',
      status: 500,
      reported: true,
      fail: () => failingWith(new Error('Unexpected error')),
    },
    {
      name: 'unclassified, as Stripe refused a request Ghost made',
      reason: 'unclassified',
      status: 400,
      reported: true,
      fail: () =>
        failingWith(
          new Stripe.errors.StripeInvalidRequestError({
            message: 'Must provide customer or customer_account.',
            statusCode: 400,
          }),
        ),
    },
    {
      name: 'stripe_access_revoked, as the key expired',
      reason: 'stripe_access_revoked',
      status: 401,
      reported: false,
      fail: () =>
        failingWith(
          new Stripe.errors.StripeAuthenticationError({
            message: 'Expired API Key provided',
            code: 'platform_api_key_expired',
            statusCode: 401,
          }),
        ),
    },
    {
      name: 'stripe_access_revoked, as Ghost lost permission',
      reason: 'stripe_access_revoked',
      status: 403,
      reported: false,
      fail: () =>
        failingWith(
          new Stripe.errors.StripePermissionError({
            message:
              'The provided key does not have access to account. Application access may have been revoked.',
            statusCode: 403,
          }),
        ),
    },
    {
      name: 'stripe_unavailable, as Stripe locked the object',
      reason: 'stripe_unavailable',
      status: 429,
      reported: true,
      fail: () =>
        failingWith(
          new Stripe.errors.StripeRateLimitError({ code: 'lock_timeout', statusCode: 429 }),
        ),
    },
    {
      name: 'stripe_unavailable, as Ghost couldn’t reach Stripe',
      reason: 'stripe_unavailable',
      status: 500,
      reported: true,
      fail: () =>
        failingWith(new Stripe.errors.StripeConnectionError({ message: 'socket hang up' })),
    },
    {
      name: 'stripe_unavailable, as Stripe failed',
      reason: 'stripe_unavailable',
      status: 500,
      reported: true,
      fail: () => failingWith(new Stripe.errors.StripeAPIError({ statusCode: 500 })),
    },
    {
      name: 'no_member_for_customer',
      reason: 'no_member_for_customer',
      status: 404,
      reported: true,
      fail: () =>
        failingWith(
          new errors.NotFoundError({ code: FAILURE_CODES.noMemberForCustomer, message: 'x' }),
        ),
    },
    {
      name: 'unsupported_subscription',
      reason: 'unsupported_subscription',
      status: 400,
      reported: true,
      fail: () =>
        failingWith(
          new errors.BadRequestError({
            code: FAILURE_CODES.unsupportedSubscription,
            message: 'x',
          }),
        ),
    },
    {
      name: 'signature_mismatch',
      reason: 'signature_mismatch',
      status: 401,
      reported: true,
      fail: () => {
        deps.webhookManager.parseWebhook.rejects(
          new Stripe.errors.StripeSignatureVerificationError({
            message: 'No signatures found matching the expected signature for payload.',
          }),
        );
      },
    },
    {
      name: 'unclassified, as the signature couldn’t be checked',
      reason: 'unclassified',
      status: 401,
      reported: true,
      fail: () => {
        deps.webhookManager.parseWebhook.rejects(new TypeError('Cannot read properties of null'));
      },
    },
    {
      name: 'webhook_secret_missing',
      reason: 'webhook_secret_missing',
      status: 401,
      reported: true,
      fail: () => {
        deps.webhookManager.parseWebhook.rejects(
          new errors.UnauthorizedError({ code: FAILURE_CODES.webhookSecretMissing, message: 'x' }),
        );
      },
    },
  ];

  it.each(failures.map((failure) => [failure.name, failure]))(
    'reports a failed event to Sentry only for reasons Ghost reports: %s',
    async function (_name, { reason, status, reported, fail }) {
      const thrown = fail();

      await controller.handle(req, res);

      sinon.assert.calledOnceWithExactly(res.writeHead, status);
      if (!reported) {
        sinon.assert.notCalled(deps.sentry.captureException);
        return;
      }
      sinon.assert.calledOnce(deps.sentry.captureException);
      const [captured] = deps.sentry.captureException.firstCall.args;
      assert.equal(classifyFailure(captured).reason, reason);
      if (thrown) {
        assert.equal(captured, thrown);
      }
    },
  );
});
