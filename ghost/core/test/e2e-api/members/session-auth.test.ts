import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const DomainEvents = require('@tryghost/domain-events');
const {
  EmailBouncedEvent,
} = require('../../../core/server/services/email-service/events/email-bounced-event');

const SIGNED_IN_EMAIL = 'session-auth@example.com';
const ANONYMOUS_TARGET_EMAIL = 'session-auth-suppressed@example.com';

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
  delete: (_url: string) => any;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<any>;
  duplicate: () => MembersAgent;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

/**
 * What the members API does when it cannot tell who is asking.
 *
 * Endpoints that exist only to serve the member making the request now say so, by
 * sitting behind a gate that resolves the member and answers for them when there
 * is none. How it answers is the endpoint's choice, and there are two:
 *
 * Reading the member is answered with nothing, because a themed page asks on every
 * view and most of those views have no member. Everything else is refused, because
 * changing a member's record is not something an unknown caller has a right to.
 *
 * Every fact these tests set up or check is set up and checked through an API: the
 * Admin API stands in for the publisher, the members API for the member. The one
 * exception is putting an address on the email suppression list, which no API can
 * do — see `suppressEmail`.
 */
describe('Members API session authentication', function () {
  let membersAgent: MembersAgent;
  let adminAgent: AdminAgent;

  /**
   * Put an address on the email suppression list, the way Ghost itself does.
   *
   * No API can do this. The Admin API takes an address off the list
   * (`DELETE /members/:id/suppression`) but nothing puts one on: an address gets
   * there only when the email provider reports a permanent bounce or a spam
   * complaint, and Ghost hears about that as a domain event. Dispatching that
   * event is the same entry point the provider's report arrives through, so this
   * is setup through Ghost rather than around it — no row is written here and
   * nothing depends on the shape of the table.
   *
   * Being unemailable is two records, and the real path sets both: the address
   * joins a list the provider also writes to, and the member picks up a flag of
   * their own. Everything below observes the pair through the Admin API, which
   * reports a member as suppressed while either is set.
   */
  async function suppressEmail(email: string, memberId: string) {
    DomainEvents.dispatch(
      EmailBouncedEvent.create({
        email,
        memberId,
        // No email was really sent, and nothing here is about which one it was.
        emailId: null,
        emailRecipientId: null,
        // Ghost suppresses an address on a permanent failure and ignores the rest,
        // so a code it acts on is the situation this is setting up.
        error: { message: 'Recipient address rejected', code: 607 },
      }),
    );
    await DomainEvents.allSettled();
  }

  async function readMemberAsStaff(email: string) {
    const { body } = await adminAgent.get(`members/?filter=email:'${email}'`).expectStatus(200);
    assert.equal(body.members.length, 1, `exactly one member holds ${email}`);
    return body.members[0];
  }

  /** Every member the site holds, by name, as staff can see them. */
  async function memberNamesAsStaff(): Promise<Record<string, string>> {
    const { body } = await adminAgent.get('members/?limit=all').expectStatus(200);
    return Object.fromEntries(
      body.members.map((member: { id: string; name: string }) => [member.id, member.name]),
    );
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters');
    await adminAgent.loginAsOwner();
  });

  describe('with nobody signed in', function () {
    // A fresh agent per case: signing in is what these are the absence of, so a
    // shared one would only be signed out while these happened to run first.
    const anonymous = () => membersAgent.duplicate();

    it('answers an ask for the member themselves with nothing', async function () {
      // The site has members. Without that, an empty answer would only be saying
      // the site is empty rather than that this request names nobody.
      assert.ok(
        Object.keys(await memberNamesAsStaff()).length > 0,
        'the site holds members this could have answered with',
      );

      const { statusCode, text } = await anonymous().get('/api/member/');

      // The one endpoint where not knowing is an ordinary answer: a themed page
      // asks this on every view and most of those views have no member.
      assert.equal(statusCode, 204);
      // And nothing in the body, because "no content" that carried a member would
      // be handing one out to a caller who named none.
      assert.equal(text, '');
    });

    it('refuses a change to the member, and changes nothing', async function () {
      // An anonymous request names no member, so what it must not do is change any
      // of them. Every member is recorded, not one, because a write that reached
      // some other member than the one a test happened to pick would still be a
      // write that should not have happened.
      const before = await memberNamesAsStaff();
      assert.ok(Object.keys(before).length > 0, 'there are members a write could have reached');

      const { statusCode, body } = await anonymous().put('/api/member/').body({ name: 'Nobody' });

      // Refused as unauthorized, which it is. This used to be a bad-request whose
      // reason named the session cookie, telling a caller both the wrong thing and
      // more than it needed to know.
      assert.equal(statusCode, 401);
      assert.match(body.errors[0].message, /you must be signed in/i);
      assert.ok(
        !JSON.stringify(body).includes('ghost-members-ssr'),
        'the refusal does not name the cookie a session is carried in',
      );

      // Refusing is only half of it: a refusal that still wrote would pass on the
      // status alone.
      assert.deepEqual(await memberNamesAsStaff(), before);
    });

    it('refuses removing an email from the suppression list, and removes nothing', async function () {
      // A member of its own, so this does not depend on the member these tests
      // sign in as, which does not exist until they do.
      const { body: created } = await adminAgent
        .post('members/')
        .body({ members: [{ email: ANONYMOUS_TARGET_EMAIL, name: 'Suppressed' }] })
        .expectStatus(201);
      await suppressEmail(ANONYMOUS_TARGET_EMAIL, created.members[0].id);
      assert.equal(
        (await readMemberAsStaff(ANONYMOUS_TARGET_EMAIL)).email_suppression.suppressed,
        true,
        'the member starts out unemailable, so there is something to remove',
      );

      const { statusCode, body } = await anonymous().delete('/api/member/suppression');

      assert.equal(statusCode, 401);
      assert.match(body.errors[0].message, /you must be signed in/i);
      assert.ok(
        !JSON.stringify(body).includes('ghost-members-ssr'),
        'the refusal does not name the cookie a session is carried in',
      );

      assert.equal(
        (await readMemberAsStaff(ANONYMOUS_TARGET_EMAIL)).email_suppression.suppressed,
        true,
        'the member is still unemailable',
      );
    });
  });

  describe('with a member signed in', function () {
    beforeAll(async function () {
      await membersAgent.loginAs(SIGNED_IN_EMAIL);
    });

    it('answers an ask for the member themselves', async function () {
      const { body } = await membersAgent.get('/api/member/').expectStatus(200);

      assert.equal(body.email, SIGNED_IN_EMAIL);
      // The same record staff are looking at, rather than something that merely
      // carries the right address.
      assert.equal(body.uuid, (await readMemberAsStaff(SIGNED_IN_EMAIL)).uuid);
    });

    it('applies a change to the member', async function () {
      const before = await readMemberAsStaff(SIGNED_IN_EMAIL);
      assert.notEqual(before.name, 'Signed In', 'the name is not already what this sets it to');

      const { body } = await membersAgent
        .put('/api/member/')
        .body({ name: 'Signed In' })
        .expectStatus(200);

      assert.equal(body.name, 'Signed In');

      // Asked again rather than trusting the response. That the response happens
      // to be a fresh read is this endpoint's business, not something a test of
      // what it stores should rely on, and staff reading the same record is what
      // says it was stored rather than echoed.
      assert.equal((await readMemberAsStaff(SIGNED_IN_EMAIL)).name, 'Signed In');
    });

    it('lets Ghost email a member again after it stopped', async function () {
      const member = await readMemberAsStaff(SIGNED_IN_EMAIL);
      await suppressEmail(SIGNED_IN_EMAIL, member.id);
      assert.equal(
        (await readMemberAsStaff(SIGNED_IN_EMAIL)).email_suppression.suppressed,
        true,
        'the member starts out unemailable, so there is something to undo',
      );

      await membersAgent.delete('/api/member/suppression').expectStatus(204);

      // The status alone would pass whether or not anything was undone, which is
      // the whole point of the endpoint. Staff are told a member is suppressed
      // while either half of it holds, so this reading false is both halves gone.
      assert.equal(
        (await readMemberAsStaff(SIGNED_IN_EMAIL)).email_suppression.suppressed,
        false,
        'the member is emailable again',
      );
    });
  });
});
