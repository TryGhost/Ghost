import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
const nock = require('nock');
const models = require('../../../core/server/models');
const urlUtils = require('../../../core/shared/url-utils').default;

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<void>;
  duplicate: () => MembersAgent;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

interface SentMail {
  to: string;
  subject: string;
  text: string;
}

/** An address as Portal sends it: every part is present, and an empty part is null. */
const ADDRESS = {
  line1: '1 High Street',
  line2: null,
  city: 'London',
  state: null,
  postal_code: 'N1 9GU',
  country: 'GB',
};

/** Valid values for every requirement of the gift's tier in these tests. */
const ANSWERED = {
  'checkout.shipping.name': 'Ada Lovelace',
  'checkout.shipping.address': ADDRESS,
  // Already in the format the phone field stores, so the API returns it unchanged.
  'checkout.phone': '+447400123456',
};

/** The same address as the API returns it: empty parts are omitted. */
const ADDRESS_HELD = {
  line1: '1 High Street',
  city: 'London',
  postal_code: 'N1 9GU',
  country: 'GB',
};

// Tests tier requirements on gift redemption, such as a shipping address. The gift endpoint
// returns the tier's requirements, and redeeming with `answers` saves the values to the member's
// custom fields. A signed-in member sends `answers` with the redeem request. A visitor who isn't
// signed in sends them with the magic link request, and the magic link saves them when it redeems
// the gift. Everything is set up and asserted through the Admin and members APIs.
describe('Gift redemption with tier requirements', function () {
  let adminAgent: AdminAgent;
  let membersAgent: MembersAgent;
  let addressKey: string;
  let recipientKey: string;
  let phoneKey: string;
  let tierId: string;
  let giftSequence = 0;
  let sent: () => SentMail[];

  async function defineField(name: string, type: string): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type, access: { member: 'write' } }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  /**
   * Saves the checkout settings that create the tier requirements. Shipping is required on
   * `shippingTierIds`, or on every paid tier when omitted, and limited to `countries`, or
   * unrestricted when omitted. The phone number is required on every paid tier.
   */
  async function collect(shippingTierIds?: string[], countries?: string[]): Promise<void> {
    await adminAgent
      .put('stripe/checkout/config/')
      .body({
        checkout_config: [
          {
            shipping: {
              collect: true,
              ...(shippingTierIds ? { tier_ids: shippingTierIds } : {}),
              ...(countries ? { allowed_countries: countries } : {}),
              address: { custom_field_key: addressKey },
              name: { custom_field_key: recipientKey },
            },
            phone: { collect: true, custom_field_key: phoneKey },
          },
        ],
      })
      .expectStatus(200);
  }

  /** Creates a purchased gift of the tier and returns its token. */
  async function purchasedGift(): Promise<string> {
    giftSequence += 1;
    const token = `gift-answers-${Date.now()}-${giftSequence}`;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await models.Gift.add({
      token,
      buyer_email: `gift-buyer-${giftSequence}@example.com`,
      buyer_member_id: null,
      redeemer_member_id: null,
      tier_id: tierId,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_gift_answers_${Date.now()}_${giftSequence}`,
      stripe_payment_intent_id: `pi_gift_answers_${Date.now()}_${giftSequence}`,
      checkout_started_at: now,
      consumes_at: null,
      expires_at: expiresAt,
      status: 'purchased',
      purchased_at: now,
      redeemed_at: null,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
    });
    return token;
  }

  /** Creates a free member and signs them in. Returns their agent and email. */
  async function freeMember(): Promise<{ agent: MembersAgent; email: string }> {
    giftSequence += 1;
    const agent = membersAgent.duplicate();
    const email = `gift-redeemer-${Date.now()}-${giftSequence}@example.com`;
    await agent.loginAs(email);
    return { agent, email };
  }

  /** Reads the member through the Admin API. */
  async function asStaff(email: string) {
    const { body: found } = await adminAgent
      .get(`members/?filter=email:'${email}'`)
      .expectStatus(200);
    const { body } = await adminAgent.get(`members/${found.members[0].id}/`).expectStatus(200);
    return body.members[0];
  }

  /** Reads the member's custom field values through the Admin API. */
  async function heldAsStaff(email: string): Promise<Record<string, unknown>> {
    return (await asStaff(email)).metafields?.custom ?? {};
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters', 'integrations', 'api_keys');
    await adminAgent.loginAsOwner();
  });

  beforeEach(async function () {
    const mail = mockManager.mockMail();
    sent = () => {
      const mails: SentMail[] = [];
      for (let next = mail.getSentEmail(0); next; next = mail.getSentEmail(mails.length)) {
        mails.push(next);
      }
      return mails;
    };
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('customFieldTypePhone');
    addressKey = await defineField('Delivery address', 'address');
    recipientKey = await defineField('Recipient name', 'short_text');
    phoneKey = await defineField('Contact phone', 'phone');
    const tier = await stripeMocker.createTier({
      currency: 'usd',
      monthly_price: 500,
      yearly_price: 5000,
    });
    tierId = tier.id;
    await collect([tierId]);
  });

  afterEach(async function () {
    await DomainEvents.allSettled();
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('tier_requirement_tiers').del();
    await models.Base.knex('tier_requirements').del();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('webhooks').del();
  });

  describe('GET /gifts/:token/redeem/', function () {
    it("returns the tier's requirements with each port and its custom field", async function () {
      const token = await purchasedGift();

      const { body } = await membersAgent.get(`/api/gifts/${token}/redeem/`).expectStatus(200);

      const byName = Object.fromEntries(
        body.gifts[0].tier.requirements.map((requirement: { name: string }) => [
          requirement.name,
          requirement,
        ]),
      );
      assert.deepEqual(byName, {
        shipping: {
          name: 'shipping',
          ports: {
            recipient: { port: 'checkout.shipping.name', field: `custom.${recipientKey}` },
            address: { port: 'checkout.shipping.address', field: `custom.${addressKey}` },
          },
        },
        phone: {
          name: 'phone',
          ports: { number: { port: 'checkout.phone', field: `custom.${phoneKey}` } },
        },
      });
    });

    it('returns the countries shipping is limited to', async function () {
      await collect([tierId], ['GB', 'US']);
      const token = await purchasedGift();

      const { body } = await membersAgent.get(`/api/gifts/${token}/redeem/`).expectStatus(200);

      const shipping = body.gifts[0].tier.requirements.find(
        (requirement: { name: string }) => requirement.name === 'shipping',
      );
      assert.deepEqual(shipping.countries, ['GB', 'US']);
    });

    it('returns an empty list for a tier with no requirements', async function () {
      await adminAgent
        .put('stripe/checkout/config/')
        .body({ checkout_config: [{ shipping: { collect: false }, phone: { collect: false } }] })
        .expectStatus(200);
      const token = await purchasedGift();

      const { body } = await membersAgent.get(`/api/gifts/${token}/redeem/`).expectStatus(200);

      assert.deepEqual(body.gifts[0].tier.requirements, []);
    });

    it('omits requirements when the checkout collection flag is off', async function () {
      const token = await purchasedGift();
      mockManager.mockLabsDisabled('stripeCheckoutCollection');

      const { body } = await membersAgent.get(`/api/gifts/${token}/redeem/`).expectStatus(200);

      assert.ok(!Object.hasOwn(body.gifts[0].tier, 'requirements'));
    });
  });

  describe('POST /gifts/:token/redeem/ with answers', function () {
    /** Reads the member's custom field change events from the activity feed, newest first. */
    async function fieldChangesInActivityFeed(memberId: string) {
      const filter = encodeURIComponent(`data.member_id:'${memberId}'+type:metafield_change_event`);
      const { body } = await adminAgent
        .get(`members/events/?filter=${filter}&limit=1000`)
        .expectStatus(200);
      return body.events;
    }

    it('redeems the gift when the request has no answers', async function () {
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      await agent.post(`/api/gifts/${token}/redeem/`).body({}).expectStatus(200);

      assert.equal((await asStaff(email)).status, 'gift');
      assert.deepEqual(await heldAsStaff(email), {});
    });

    it('saves each value to its custom field and records one change by the member from Portal', async function () {
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      const { body } = await agent
        .post(`/api/gifts/${token}/redeem/`)
        .body({ answers: ANSWERED })
        .expectStatus(200);

      assert.equal(body.gifts[0].token, token);
      const member = await asStaff(email);
      assert.equal(member.status, 'gift');
      assert.deepEqual(
        member.tiers.map((tier: { id: string }) => tier.id),
        [tierId],
      );
      assert.deepEqual(await heldAsStaff(email), {
        [addressKey]: ADDRESS_HELD,
        [recipientKey]: 'Ada Lovelace',
        [phoneKey]: '+447400123456',
      });
      const events = await fieldChangesInActivityFeed(member.id);
      assert.equal(events.length, 1, 'expected one change event');
      assert.equal(events[0].data.written_by_type, 'member', 'expected the member as the writer');
      assert.equal(events[0].data.source, 'portal');
    });

    it('sends one member.edited webhook with the gift status and the custom field values', async function () {
      const delivered: Array<{
        member: {
          current: {
            email: string;
            status: string;
            metafields?: { custom?: Record<string, unknown> };
          };
        };
      }> = [];
      nock('https://test-webhook-receiver.com')
        .persist()
        .post('/gift-redemption-member-edited/')
        .reply(200, (_uri: string, body: unknown) => {
          delivered.push(typeof body === 'string' ? JSON.parse(body) : body);
          return {};
        });
      await fixtureManager.insertWebhook({
        event: 'member.edited',
        url: 'https://test-webhook-receiver.com/gift-redemption-member-edited/',
      });
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      await agent.post(`/api/gifts/${token}/redeem/`).body({ answers: ANSWERED }).expectStatus(200);

      const redeemed = await vi.waitUntil(
        () => delivered.find(({ member }) => member.current.status === 'gift'),
        { timeout: 5000 },
      );
      assert.equal(redeemed.member.current.email, email);
      assert.deepEqual(redeemed.member.current.metafields?.custom, {
        [addressKey]: ADDRESS_HELD,
        [recipientKey]: 'Ada Lovelace',
        [phoneKey]: '+447400123456',
      });
    });

    it('does not redeem the gift when answers fail validation, and returns an error for each invalid port', async function () {
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      const { body } = await agent
        .post(`/api/gifts/${token}/redeem/`)
        .body({
          answers: {
            ...ANSWERED,
            'checkout.shipping.address': { ...ADDRESS, country: 'United Kingdom' },
            'checkout.phone': 'x'.repeat(300),
          },
        })
        .expectStatus(422);

      assert.equal(body.errors[0].type, 'ValidationError');
      assert.deepEqual(
        body.errors[0].details.map((detail: { property: string }) => detail.property).sort(),
        ['answers.checkout.phone', 'answers.checkout.shipping.address.country'],
      );
      assert.equal((await asStaff(email)).status, 'free');
      assert.deepEqual(await heldAsStaff(email), {});

      // The same member can still redeem the gift with valid values.
      await agent.post(`/api/gifts/${token}/redeem/`).body({ answers: ANSWERED }).expectStatus(200);
      assert.equal((await asStaff(email)).status, 'gift');
    });

    it('rejects an address outside the countries shipping is limited to', async function () {
      await collect([tierId], ['US']);
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      const { body } = await agent
        .post(`/api/gifts/${token}/redeem/`)
        .body({ answers: ANSWERED })
        .expectStatus(422);

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.address.country');
      assert.equal((await asStaff(email)).status, 'free');
    });

    it('rejects a partly answered requirement, with an error for the missing port', async function () {
      const token = await purchasedGift();
      const { agent, email } = await freeMember();

      const { body } = await agent
        .post(`/api/gifts/${token}/redeem/`)
        .body({
          answers: { 'checkout.shipping.address': ADDRESS, 'checkout.phone': '+44 7400 123456' },
        })
        .expectStatus(422);

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.name');
      assert.equal((await asStaff(email)).status, 'free');
    });

    it('does not save the values when the gift cannot be redeemed', async function () {
      const token = await purchasedGift();
      const first = await freeMember();
      await first.agent.post(`/api/gifts/${token}/redeem/`).body({}).expectStatus(200);
      const second = await freeMember();

      await second.agent
        .post(`/api/gifts/${token}/redeem/`)
        .body({ answers: ANSWERED })
        .expectStatus(400);

      assert.equal((await asStaff(second.email)).status, 'free');
      assert.deepEqual(await heldAsStaff(second.email), {});
    });

    it('redeems without saving the values when the checkout collection flag is off', async function () {
      const token = await purchasedGift();
      const { agent, email } = await freeMember();
      mockManager.mockLabsDisabled('stripeCheckoutCollection');

      await agent.post(`/api/gifts/${token}/redeem/`).body({ answers: ANSWERED }).expectStatus(200);

      assert.equal((await asStaff(email)).status, 'gift');
      assert.deepEqual(await heldAsStaff(email), {});
    });
  });
  describe('POST /send-magic-link/ with a gift token and answers', function () {
    /**
     * Requests the magic link the way Portal does when a visitor who isn't signed in redeems a
     * gift, and expects the response to have `status`.
     */
    async function requestLink(
      agent: MembersAgent,
      email: string,
      token: string,
      answers: unknown,
      { status = 201, name = 'Gift Receiver' } = {},
    ) {
      const { text: integrityToken } = await agent.get('/api/integrity-token/').expectStatus(200);
      const redirect = new URL(urlUtils.getSiteUrl());
      redirect.searchParams.set('giftRedemption', 'true');
      return agent
        .post('/api/send-magic-link/')
        .body({
          email,
          name,
          emailType: 'subscribe',
          integrityToken,
          giftToken: token,
          redirect: redirect.href,
          ...(answers === undefined ? {} : { answers }),
        })
        .expectStatus(status);
    }

    /** Opens the magic link emailed to this address and returns the URL it redirects to. */
    async function followLink(agent: MembersAgent, email: string): Promise<URL> {
      const mail = sent().find(({ to }) => to === email);
      assert.ok(mail, `expected an email to ${email}`);
      const [link] = mail.text.match(/https?:\/\/[^\s]+/) ?? [];
      assert.ok(link, 'expected a link in the email');
      const res = await agent.get(`/${new URL(link).search}`).expectStatus(302);
      return new URL(res.headers.location, urlUtils.getSiteUrl());
    }

    function visitor(): { agent: MembersAgent; email: string } {
      giftSequence += 1;
      return {
        agent: membersAgent.duplicate(),
        email: `gift-visitor-${Date.now()}-${giftSequence}@example.com`,
      };
    }

    async function memberExists(email: string): Promise<boolean> {
      return (await models.Member.findOne({ email }, { require: false })) !== null;
    }

    async function giftStatus(token: string): Promise<string> {
      return (await models.Gift.findOne({ token }, { require: true })).get('status');
    }

    it('creates the member, redeems the gift and saves the values when the magic link is used', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();

      await requestLink(agent, email, token, ANSWERED);
      assert.equal(await memberExists(email), false, 'expected no member before the link is used');
      assert.equal(await giftStatus(token), 'purchased');

      const landed = await followLink(agent, email);

      assert.equal(landed.searchParams.get('success'), 'true');
      const member = await asStaff(email);
      assert.equal(member.status, 'gift');
      assert.deepEqual(
        member.tiers.map((tier: { id: string }) => tier.id),
        [tierId],
      );
      assert.deepEqual(await heldAsStaff(email), {
        [addressKey]: ADDRESS_HELD,
        [recipientKey]: 'Ada Lovelace',
        [phoneKey]: '+447400123456',
      });
      assert.equal(await giftStatus(token), 'redeemed');
    });

    it('creates the member with the values on a site that only accepts paid members', async function () {
      mockManager.mockSetting('members_signup_access', 'paid');
      const token = await purchasedGift();
      const { agent, email } = visitor();

      await requestLink(agent, email, token, ANSWERED);
      assert.equal(await memberExists(email), false, 'expected no member before the link is used');
      await followLink(agent, email);

      assert.equal((await asStaff(email)).status, 'gift');
      assert.deepEqual((await heldAsStaff(email))[addressKey], ADDRESS_HELD);
    });

    it('redeems the gift and saves the values for an existing member who is signed out', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();
      await models.Member.add({ email, name: 'Existing Member', email_disabled: false });
      await DomainEvents.allSettled();

      await requestLink(agent, email, token, ANSWERED);
      await followLink(agent, email);

      const member = await asStaff(email);
      assert.equal(member.name, 'Existing Member');
      assert.equal(member.status, 'gift');
      assert.deepEqual((await heldAsStaff(email))[addressKey], ADDRESS_HELD);
    });

    // The magic link stores these values with the visitor's name until the link is used. Together
    // they are longer than 2,000 characters, the most the token's data column held before it was
    // changed to TEXT.
    it('saves values at the maximum length of every field', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();
      const line = 'Long address line '.repeat(15).slice(0, 255);
      const name = 'Long Name '.repeat(20).slice(0, 191);
      const longest = {
        'checkout.shipping.name': line,
        'checkout.shipping.address': {
          line1: line,
          line2: line,
          city: line,
          state: line,
          postal_code: 'N'.repeat(32),
          country: 'GB',
        },
        'checkout.phone': '+447400123456',
      };

      await requestLink(agent, email, token, longest, { name });
      await followLink(agent, email);

      assert.equal((await asStaff(email)).name, name.trim());
      const held = await heldAsStaff(email);
      assert.equal(held[recipientKey], line);
      assert.deepEqual(held[addressKey], longest['checkout.shipping.address']);
    });

    it('returns an error for each invalid port and sends no email', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();

      const { body } = await requestLink(
        agent,
        email,
        token,
        {
          ...ANSWERED,
          'checkout.shipping.address': { ...ADDRESS, country: 'United Kingdom' },
          'checkout.phone': 'x'.repeat(300),
        },
        { status: 422 },
      );

      assert.equal(body.errors[0].type, 'ValidationError');
      assert.deepEqual(
        body.errors[0].details.map((detail: { property: string }) => detail.property).sort(),
        ['answers.checkout.phone', 'answers.checkout.shipping.address.country'],
      );
      assert.equal(sent().length, 0);
      assert.equal(await giftStatus(token), 'purchased');
    });

    it('rejects an address outside the countries shipping is limited to and sends no email', async function () {
      await collect([tierId], ['US']);
      const token = await purchasedGift();
      const { agent, email } = visitor();

      const { body } = await requestLink(agent, email, token, ANSWERED, { status: 422 });

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.address.country');
      assert.equal(sent().length, 0);
    });

    it('does not create the member or redeem the gift when the values are no longer valid at the time the magic link is used', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();
      await requestLink(agent, email, token, ANSWERED);

      // The publisher limits shipping to another country after the email was sent.
      await collect([tierId], ['US']);
      const landed = await followLink(agent, email);

      assert.equal(landed.searchParams.get('success'), 'false');
      assert.equal(await memberExists(email), false);
      assert.equal(await giftStatus(token), 'purchased');
    });

    it('redeems the gift without saving values when the request has no answers', async function () {
      const token = await purchasedGift();
      const { agent, email } = visitor();

      await requestLink(agent, email, token, undefined);
      await followLink(agent, email);

      assert.equal((await asStaff(email)).status, 'gift');
      assert.deepEqual(await heldAsStaff(email), {});
    });

    it('redeems the gift without saving the values when the checkout collection flag is off', async function () {
      mockManager.mockLabsDisabled('stripeCheckoutCollection');
      const token = await purchasedGift();
      const { agent, email } = visitor();

      await requestLink(agent, email, token, ANSWERED);
      await followLink(agent, email);

      assert.equal((await asStaff(email)).status, 'gift');
      assert.deepEqual(await heldAsStaff(email), {});
    });
  });
});
