import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import FormData from 'form-data';
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
const mailService = require('../../../core/server/services/mail') as {
  GhostMailer: { prototype: { send(...args: unknown[]): Promise<unknown> } };
};
const membersService = require('../../../core/server/services/members') as {
  stripeConnect: StripeConnect;
};
const limits = require('../../../core/server/services/limits') as LimitService;

/** What an Admin API request answers with, narrowed to the parts these tests read. */
interface ApiResponse {
  body: {
    errors?: Array<{
      type: string;
      message: string;
      context: string;
      help: string;
      details: { name: string; limit: number; total: number };
    }>;
    config?: {
      hostSettings?: { limits?: Record<string, HostLimitConfig>; billing?: { url?: string } };
    };
    newsletters?: Array<{ slug: string }>;
    roles?: Array<{ id: string; name: string }>;
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
      assert.equal(body.config?.hostSettings?.limits, undefined);
    });

    it('forgets the limits it was holding once the host sends none', async function () {
      await hostLimits.setHostLimits({ newsletters: { max: 0 } });
      assert.equal(limits.isLimited('newsletters'), true);

      await hostLimits.restoreHostLimits();

      assert.equal(limits.isLimited('newsletters'), false);
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

      assert.equal(body.errors?.[0].type, 'HostLimitError');
    });

    // Worth knowing before anything is refactored: the wording a hosting provider takes the
    // trouble to configure never becomes the message. The endpoint puts its own sentence
    // there and the host's wording is carried alongside it, so a client showing only the
    // message shows the publisher nothing the host wrote, and nothing about upgrading.
    it('carries the wording the host configured beside the message, not in it', async function () {
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

      assert.equal(body.errors?.[0].message, 'Host Limit error, cannot edit setting.');
      assert.equal(
        body.errors?.[0].context,
        'Payments are available on the Creator plan and above.',
      );
    });

    it('leaves the feature alone when the flag is present but not set', async function () {
      await hostLimits.setHostLimits({ limitStripeConnect: { disabled: false } });
      stubStripeToken();

      await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(200);
    });

    // What a real host sends. Ghost(Pro) holds every limit value in a single string column,
    // and normalises a flag to the words 'true' or 'false' before handing it over, so a flag
    // never arrives here as a boolean at all. Nothing above this covers that, which means the
    // one shape production actually uses was the one shape going untested.
    it('refuses when the flag arrives as the string a host sends', async function () {
      await hostLimits.setHostLimits({ limitStripeConnect: { disabled: 'true' } });
      stubStripeToken();

      await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(403);
    });

    // Recorded because it is surprising, not because it is wanted. A flag is read for its
    // truthiness, and the string 'false' is truthy, so a host that switches a feature off by
    // sending the word 'false' gets the opposite of what it asked for. Nothing reaches this
    // today: a site is exempted from a flag by dropping the limit, not by sending it false.
    // Anyone who changes that upstream needs to change this first.
    it('also refuses when that string is the word false', async function () {
      await hostLimits.setHostLimits({ limitStripeConnect: { disabled: 'false' } });
      stubStripeToken();

      await agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: 'token' }] })
        .expectStatus(403);
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

      assert.equal(body.errors?.[0].type, 'HostLimitError');
      assert.equal(body.errors?.[0].message, 'Host Limit error, cannot save newsletter.');
      // Both placeholders are filled in, which is the whole point of letting a host write
      // the sentence. The count is left loose because earlier tests add newsletters, but a
      // digit where `{{count}}` was is enough to show it was replaced rather than printed.
      assert.match(
        body.errors?.[0].context ?? '',
        /^Your plan is limited to 1 newsletters\. You have \d+\.$/,
      );
      assert.equal(body.errors?.[0].details.limit, 1);
    });

    it('allows the action while there is room', async function () {
      await hostLimits.setHostLimits({ newsletters: { max: 100 } });

      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Plenty of room' }] })
        .expectStatus(201);
    });

    it('compares against a maximum sent as a string, as a host sends it', async function () {
      await hostLimits.setHostLimits({ newsletters: { max: '0' } });

      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Never' }] })
        .expectStatus(403);

      await hostLimits.setHostLimits({ newsletters: { max: '100' } });

      await agent
        .post('newsletters/')
        .body({ newsletters: [{ name: 'Room to spare' }] })
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

      assert.equal(body.errors?.[0].type, 'HostLimitError');
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

      const post = created.posts?.[0];
      assert.ok(post, 'expected the draft to have been created');

      const { body } = await agent
        .put(`posts/${post.id}/?newsletter=${newsletterSlug}`)
        .body({ posts: [{ ...post, status: 'published' }] })
        .expectStatus(403);

      assert.equal(body.errors?.[0].type, 'HostLimitError');
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
      assert.equal(body.errors?.[0].type, 'HostLimitError');
      assert.match(body.errors?.[0].context, /newsletters limit on your current plan/);
      assert.equal(body.errors?.[0].message, 'Host Limit error, cannot save newsletter.');
      // Which limit was hit, and where to go about it. When a host runs its own billing the
      // link points there rather than at Ghost's help site, and that is the whole reason a
      // host configures one.
      assert.equal(body.errors?.[0].details.name, 'newsletters');
      assert.equal(body.errors?.[0].help, 'https://billing.example.com');
    });
  });

  describe('what the browser is told', function () {
    it('hands the whole limits block to the client, so it can gate the same way', async function () {
      await hostLimits.setHostLimits(
        { limitAnalytics: { disabled: true }, staff: { max: 3 } },
        { billing: { enabled: true, url: 'https://billing.example.com' } },
      );

      const { body } = await agent.get('config/').expectStatus(200);

      assert.equal(body.config?.hostSettings?.limits?.limitAnalytics.disabled, true);
      assert.equal(body.config?.hostSettings?.limits?.staff.max, 3);
      assert.equal(body.config?.hostSettings?.billing?.url, 'https://billing.example.com');
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

  describe('a limit the caller counts against', function () {
    // Uploads are the only limit Ghost checks against a count the caller supplies, the size
    // of the file, rather than one the limit service goes and fetches. They are also the
    // only limit whose numbers are rewritten for the reader, from bytes into megabytes.
    //
    // Only files and media are checked. Images are not, which is why this uploads a file.
    const upload = (): Request => {
      const form = new FormData();
      form.append(
        'file',
        readFileSync(path.join(__dirname, '../../utils/fixtures/images/loadingcat_square.gif')),
        { filename: 'loadingcat_square.gif', contentType: 'image/gif' },
      );
      form.append('ref', 'host-limits');

      return agent.post('files/upload/').body(form);
    };

    it('refuses a file over the allowance, sized the way a reader expects', async function () {
      await hostLimits.setHostLimits({
        uploads: { max: 9000, error: 'Files must be under {{max}}.' },
      });

      const { body } = await upload().expectStatus(403);

      assert.equal(body.errors?.[0].type, 'HostLimitError');
      // Bytes are what the limit is set and counted in. Megabytes are what the message
      // says, so the number a publisher reads is in the units they were sold.
      assert.equal(body.errors?.[0].message, 'Files must be under 0.009MB.');
    });

    it('accepts a file inside it', async function () {
      await hostLimits.setHostLimits({ uploads: { max: 1000000 } });

      await upload().expectStatus(201);
    });
  });

  describe('a limit that stops a site doing anything further while it is over', function () {
    // Being over the member allowance does not stop a publisher gaining members. It stops
    // them publishing, which is a different question from the one every other counted limit
    // answers, and the only place Ghost asks it of a count it has to go and fetch.
    it('refuses to publish a post while the site is over its member allowance', async function () {
      await hostLimits.setHostLimits({ members: { max: 0 } });

      const { body } = await agent
        .post('posts/')
        .body({ posts: [{ title: 'Over the allowance', status: 'published' }] })
        .expectStatus(403);

      assert.equal(body.errors?.[0].type, 'HostLimitError');
    });

    it('publishes while the site is inside it', async function () {
      await hostLimits.setHostLimits({ members: { max: 1000 } });

      await agent
        .post('posts/')
        .body({ posts: [{ title: 'Inside the allowance', status: 'published' }] })
        .expectStatus(201);
    });
  });

  describe('a limit that what is being added is exempt from', function () {
    // Staff is the only limit where the thing being added decides whether the limit applies
    // at all: Contributors are not staff, so they neither count towards the allowance nor
    // are refused by it. The count behind it is the most involved one Ghost keeps, spanning
    // users and unaccepted invitations both.
    beforeEach(function () {
      sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
    });

    const roleId = async (name: string): Promise<string> => {
      const { body } = await agent.get('roles/?permissions=assign');
      const role = (body.roles ?? []).find((candidate) => candidate.name === name);

      assert.ok(role, `expected the site to have a ${name} role`);

      return role.id;
    };

    it('refuses an invitation that would take the site past its staff allowance', async function () {
      await hostLimits.setHostLimits({ staff: { max: 1 } });

      const { body } = await agent
        .post('invites/')
        .body({ invites: [{ email: 'over@example.com', role_id: await roleId('Author') }] })
        .expectStatus(403);

      assert.equal(body.errors?.[0].type, 'HostLimitError');
    });

    it('invites a contributor regardless, because they are not staff', async function () {
      await hostLimits.setHostLimits({ staff: { max: 1 } });

      await agent
        .post('invites/')
        .body({
          invites: [{ email: 'contributor@example.com', role_id: await roleId('Contributor') }],
        })
        .expectStatus(201);
    });
  });
});
