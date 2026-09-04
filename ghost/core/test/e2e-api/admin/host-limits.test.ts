import assert from 'node:assert/strict';
import sinon from 'sinon';

import type { HostLimitConfig, HostSettings } from '../../utils/host-limits-utils';

const {
  agentProvider,
  fixtureManager,
  hostLimits,
}: {
  agentProvider: { getAdminAPIAgent(): Promise<AdminAgent> };
  fixtureManager: { init(...fixtures: string[]): Promise<void> };
  hostLimits: HostLimits;
} = require('../../utils/e2e-framework');
const membersService = require('../../../core/server/services/members') as {
  stripeConnect: StripeConnect;
};
const limits = require('../../../core/server/services/limits') as LimitService;

/** What an Admin API request answers with, narrowed to the parts these tests read. */
interface ApiResponse {
  body: {
    errors?: Array<{ type: string; message: string; context: string }>;
    config?: {
      hostSettings?: { limits?: Record<string, HostLimitConfig>; billing?: { url?: string } };
    };
    newsletters?: Array<{ slug: string }>;
    posts?: Array<{ id: string; status: string }>;
  };
}

/** A request in flight. Chainable, and awaited for the response. */
interface Request extends Promise<ApiResponse> {
  body(payload: unknown): Request;
  expectStatus(status: number): Request;
}

interface AdminAgent {
  get(url: string): Request;
  post(url: string): Request;
  put(url: string): Request;
  loginAsOwner(): Promise<void>;
}

interface HostLimits {
  setHostLimits(limits: Record<string, HostLimitConfig>, rest?: HostSettings): Promise<void>;
  restoreHostLimits(): Promise<void>;
}

interface LimitService {
  isLimited(name: string): boolean;
  isDisabled(name: string): boolean | undefined;
  problems: Array<{ limit: string; reason: string }>;
}

interface StripeConnect {
  getStripeConnectTokenData(): Promise<unknown>;
}

/**
 * What a hosting provider gets when it limits a site, asserted through the API a publisher
 * actually uses rather than through the limit service's own surface.
 *
 * Every other limit test in this repository reaches for `mockManager.mockLimitService`,
 * which replaces the limit service with stubs and then checks that Ghost called them. That
 * says nothing about whether limits work: it passes just as happily against an
 * implementation that has been swapped out underneath it. These tests configure limits the
 * way Ghost(Pro) does, through host config, let the real service load them, and assert what
 * a caller receives. That is what makes them worth anything when the implementation moves.
 *
 * Setting a limit is setting configuration and nothing else. `hostLimits` hides the one
 * wrinkle, which is that limits are read during boot and have to be re-read when a test
 * changes them.
 */
describe('Host limits', function () {
  let agent: AdminAgent;

  let newsletterSlug: string;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'newsletters', 'members:newsletters', 'members:emails');
    await agent.loginAsOwner();

    const { body } = await agent.get('newsletters/?limit=1&filter=status:active').expectStatus(200);
    newsletterSlug = body.newsletters![0].slug;
  });

  afterEach(async function () {
    sinon.restore();
    await hostLimits.restoreHostLimits();
  });

  // Stripe is stubbed because the request would otherwise leave the process. That is a
  // boundary this test has no interest in, unlike the limit service, which is the thing
  // being characterised and is therefore always real.
  function stubStripeToken() {
    sinon.stub(membersService.stripeConnect, 'getStripeConnectTokenData').resolves({
      public_key: 'pk_test_123',
      secret_key: 'sk_test_123',
      livemode: null,
      display_name: null,
      account_id: null,
    });
  }

  describe('when a site has no limits at all', function () {
    it('reports none to the client', async function () {
      const { body } = await agent.get('config/').expectStatus(200);
      assert.equal(body.config.hostSettings?.limits, undefined);
    });

    it('lets the site do a thing that is limited elsewhere', async function () {
      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Unlimited newsletter' }] })
        .expectStatus(201);
    });
  });

  describe('a flag limit', function () {
    it('refuses the feature', async function () {
      await hostLimits.setHostLimits(
        {
          limitStripeConnect: {
            disabled: true,
            error: 'Payments are available on the Creator plan and above.',
          },
        },
        { billing: { enabled: true, url: 'https://billing.example.com' } },
      );
      stubStripeToken();

      const { body } = await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(403);

      assert.equal(body.errors[0].type, 'HostLimitError');
    });

    // Worth knowing before anything is refactored: the wording a hosting provider takes
    // the trouble to configure does not reach the caller on either of the paths covered
    // here. Both replace it with a sentence of their own. Where it does survive is a route
    // that answers the limit itself rather than letting an endpoint wrap it, which is a
    // difference nobody appears to have chosen.
    it('drops the wording the host configured, on this path', async function () {
      await hostLimits.setHostLimits({
        limitStripeConnect: {
          disabled: true,
          error: 'Payments are available on the Creator plan and above.',
        },
      });
      stubStripeToken();

      const { body } = await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(403);

      assert.equal(body.errors[0].message, 'Host Limit error, cannot edit setting.');
      assert.equal(/Creator plan/.test(body.errors[0].message), false);
    });

    it('leaves the feature alone when the flag is present but not set', async function () {
      await hostLimits.setHostLimits({ limitStripeConnect: { disabled: false } });
      stubStripeToken();

      await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(200);
    });
  });

  describe('a counted limit', function () {
    it('refuses once the count is reached, naming the numbers', async function () {
      await hostLimits.setHostLimits({
        newsletters: {
          max: 1,
          error: 'Your plan is limited to {{max}} newsletters. You have {{count}}.',
        },
      });

      const { body } = await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'One too many' }] })
        .expectStatus(403);

      assert.equal(body.errors[0].type, 'HostLimitError');
      // The wording the host configured does not survive this path: newsletters replace it
      // with their own generic sentence, where the settings endpoint above passes the
      // host's through untouched. Pinned as it is, because it is the sort of inconsistency
      // a refactor could quietly resolve in either direction without anyone noticing.
      assert.equal(body.errors[0].message, 'Host Limit error, cannot save newsletter.');
    });

    it('allows the action while there is room', async function () {
      await hostLimits.setHostLimits({ newsletters: { max: 100 } });

      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Plenty of room' }] })
        .expectStatus(201);
    });

    it('counts what the site actually has, not what the request says', async function () {
      // The count comes from a query the limit service runs, so a limit set below the
      // current number refuses immediately rather than allowing one more.
      await hostLimits.setHostLimits({ newsletters: { max: 0 } });

      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Never' }] })
        .expectStatus(403);
    });
  });

  describe('an allowlist limit', function () {
    it('refuses a value that is not on the list', async function () {
      await hostLimits.setHostLimits({
        customThemes: { allowlist: ['casper'], error: 'Only bundled themes are included.' },
      });

      const { body } = await agent.put('themes/source/activate/').expectStatus(403);

      assert.equal(body.errors[0].type, 'HostLimitError');
    });

    it('allows a value that is on it', async function () {
      await hostLimits.setHostLimits({ customThemes: { allowlist: ['casper', 'source'] } });

      await agent.put('themes/source/activate/').expectStatus(200);
    });
  });

  describe('a periodic limit', function () {
    it('is enforced when the host anchors the period', async function () {
      await hostLimits.setHostLimits(
        { emails: { maxPeriodic: 1 } },
        { subscription: { start: '2026-01-01T00:00:00.000Z' } },
      );

      assert.equal(limits.isLimited('emails'), true);
    });

    it('refuses a send once the allowance for this period is used up', async function () {
      // The one path where a periodic limit does its job, driven end to end rather than
      // asserted at the service. The site has already sent email this period, which the
      // limit counts by summing what went out since the period began, so the next send is
      // refused before the post is published.
      await hostLimits.setHostLimits(
        { emails: { maxPeriodic: 0 } },
        { subscription: { start: '2026-01-01T00:00:00.000Z' } },
      );

      const { body: created } = await agent
        .post('posts/')
        .body({ posts: [{ title: 'Over the allowance', status: 'draft' }] })
        .expectStatus(201);

      const post = created.posts[0];
      const { body } = await agent
        .put(`posts/${post.id}/?newsletter=${newsletterSlug}`)
        .body({ posts: [{ ...post, status: 'published' }] })
        .expectStatus(403);

      assert.equal(body.errors[0].type, 'HostLimitError');
    });

    // A periodic limit needs a period, and without one the service refuses to build it.
    // Core catches that and warns rather than failing to boot, which leaves the site
    // unlimited. Pinned because it is the shape of a limit that is configured, paid for and
    // silently not applied.
    it('is dropped, leaving the site unlimited, when the host anchors no period', async function () {
      await hostLimits.setHostLimits({ emails: { maxPeriodic: 1 } });

      assert.equal(limits.isLimited('emails'), false);
    });
  });

  describe('the shape of a refusal', function () {
    it("carries the limit name and the host's help link, which integrations read", async function () {
      await hostLimits.setHostLimits(
        { newsletters: { max: 0 } },
        { billing: { enabled: true, url: 'https://billing.example.com' } },
      );

      const { body } = await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Refused' }] })
        .expectStatus(403);

      // What an integration actually receives: the type it can branch on, and the limit's
      // own sentence in `context` rather than in `message`, which carries the endpoint's
      // generic wording instead. Pinned as it is, because a refactor tidying these two into
      // one field would change what every API consumer parses.
      assert.equal(body.errors[0].type, 'HostLimitError');
      assert.match(body.errors[0].context, /newsletters limit on your current plan/);
      assert.equal(body.errors[0].message, 'Host Limit error, cannot save newsletter.');
    });
  });

  describe('what the browser is told', function () {
    it('hands the whole limits block to the client, so it can gate the same way', async function () {
      await hostLimits.setHostLimits(
        { limitAnalytics: { disabled: true }, staff: { max: 3 } },
        { billing: { enabled: true, url: 'https://billing.example.com' } },
      );

      const { body } = await agent.get('config/').expectStatus(200);

      assert.equal(body.config.hostSettings.limits.limitAnalytics.disabled, true);
      assert.equal(body.config.hostSettings.limits.staff.max, 3);
      assert.equal(body.config.hostSettings.billing.url, 'https://billing.example.com');
    });
  });

  // The two below are the behaviours worth pinning before anything moves, because both are
  // load-bearing and neither is written down anywhere. They are also the two the follow-up
  // refactor deliberately changes, so a diff to these tests is the signal that it did.
  describe('limits it cannot build', function () {
    it('loses every other limit along with the one it cannot build', async function () {
      // An allowlist limit with an empty list cannot be built, and building stops there:
      // the limits configured alongside it never load either. A site is then unlimited in
      // ways nobody asked for, and the only trace is a warning in the log.
      await hostLimits.setHostLimits({
        customThemes: { allowlist: [] },
        limitStripeConnect: { disabled: true },
      });

      assert.equal(limits.isLimited('customThemes'), false);
      assert.equal(limits.isLimited('limitStripeConnect'), false);
    });

    it('keeps a site serving rather than failing to start', async function () {
      await hostLimits.setHostLimits({ customThemes: { allowlist: [] } });

      await agent.get('config/').expectStatus(200);
    });

    it('registers a periodic limit whose start date cannot be read', async function () {
      // It counts from that date, so an unreadable one leaves the limit counting against
      // nothing while reporting itself as applied.
      await hostLimits.setHostLimits(
        { emails: { maxPeriodic: 1 } },
        { subscription: { start: 'not a date' } },
      );

      assert.equal(limits.isLimited('emails'), true);
    });
  });

  describe('the package Ghost is built against', function () {
    it('exports something a caller can construct directly', function () {
      // Two places construct the service themselves rather than using Ghost's, so the shape
      // of the export is part of what a change to this package must not break.
      const exported = require('@tryghost/limit-service');

      assert.equal(typeof exported, 'function');
      assert.doesNotThrow(() => new exported());
    });
  });

  describe('limits it does not recognise', function () {
    it('ignores a limit name the code has never heard of, leaving the feature available', async function () {
      await hostLimits.setHostLimits({ aLimitNobodyShipped: { disabled: true } });

      assert.equal(limits.isLimited('aLimitNobodyShipped'), false);
    });

    it('drops a known limit written in another case, leaving the site unlimited', async function () {
      await hostLimits.setHostLimits({ limit_stripe_connect: { disabled: true } });
      stubStripeToken();

      // The name is matched camelCased but its settings are read under the original key, so
      // the limit loads with nothing in it and the site is not actually limited.
      await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(200);
    });
  });
});
