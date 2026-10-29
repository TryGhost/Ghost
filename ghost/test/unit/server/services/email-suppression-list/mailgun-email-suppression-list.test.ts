import assert from 'node:assert/strict';
import sinon from 'sinon';
import nock from 'nock';
import { setImmediate } from 'node:timers/promises';
import type { EmailBouncedEvent as EmailBouncedEventType } from '../../../../../core/server/services/email-service/events/email-bounced-event';
import { createLoggingFake } from '../../../../utils/logging-utils';

const SERVICE_DIR = require.resolve('../../../../../core/server/services/email-suppression-list');
// Resolve shared libraries as the root does, so the stubs replace the instances it injects.
const DomainEvents = require(require.resolve('@tryghost/domain-events', { paths: [SERVICE_DIR] }));
const db = require('../../../../../core/server/data/db');
const MailgunClient = require('../../../../../core/server/lib/mailgun/mailgun-client');
// The Mailgun client is not injected with logging, so its failures reach the shared logger.
const MAILGUN_CLIENT = require.resolve('../../../../../core/server/lib/mailgun/mailgun-client');
const clientLogging = require(require.resolve('@tryghost/logging', { paths: [MAILGUN_CLIENT] }));
const MailgunEmailSuppressionList = require('../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list');
// Required, not imported, so the test shares the event classes the root injects.
const {
  EmailBouncedEvent,
} = require('../../../../../core/server/services/email-service/events/email-bounced-event');
const {
  SpamComplaintEvent,
} = require('../../../../../core/server/services/email-service/events/spam-complaint-event');
const {
  EmailSuppressedEvent,
} = require('../../../../../core/server/services/email-suppression-list/email-suppression-list');

type Row = { email?: string; reason?: string; created_at?: unknown };
type Handler = (event: unknown) => Promise<void>;

function row(data: Row) {
  return { get: (key: keyof Row) => data[key] };
}

function createSuppressionModel() {
  return {
    findOne: sinon.stub().resolves(null),
    findAll: sinon.stub().resolves({ models: [] }),
    add: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
  };
}

function createApiClient() {
  return {
    removeBounce: sinon.stub().resolves(true),
    removeComplaint: sinon.stub().resolves(true),
    removeUnsubscribe: sinon.stub().resolves(true),
  };
}

const unsuppressed = { suppressed: false, info: null };

let logging: ReturnType<typeof createLoggingFake>;

function collaborators() {
  return { db, logging, domainEvents: DomainEvents, EmailBouncedEvent, SpamComplaintEvent };
}

describe('MailgunEmailSuppressionList', function () {
  let sandbox: sinon.SinonSandbox;
  let Suppression: ReturnType<typeof createSuppressionModel>;
  let apiClient: ReturnType<typeof createApiClient>;
  let loggedError: sinon.SinonStub;
  let loggedInfo: sinon.SinonStub;
  let list: InstanceType<typeof MailgunEmailSuppressionList>;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    Suppression = createSuppressionModel();
    apiClient = createApiClient();
    logging = createLoggingFake();
    loggedError = logging.error;
    loggedInfo = logging.info;
    list = new MailgunEmailSuppressionList({ Suppression, apiClient, ...collaborators() });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getSuppressionData', function () {
    it('looks up one address and reports it unsuppressed when no row exists', async function () {
      assert.deepEqual({ ...(await list.getSuppressionData('a@example.com')) }, unsuppressed);
      sinon.assert.calledOnceWithExactly(Suppression.findOne, { email: 'a@example.com' });
    });

    it('maps a spam row to spam and any other reason to fail, with the row creation time', async function () {
      const created = new Date('2020-01-01T00:00:00Z');
      Suppression.findOne.resolves(row({ reason: 'spam', created_at: created }));
      const spam = await list.getSuppressionData('a@example.com');
      assert.deepEqual(
        { ...spam },
        { suppressed: true, info: { reason: 'spam', timestamp: created } },
      );

      Suppression.findOne.resolves(row({ reason: 'bounce', created_at: created }));
      const bounce = await list.getSuppressionData('a@example.com');
      assert.deepEqual(
        { ...bounce },
        { suppressed: true, info: { reason: 'fail', timestamp: created } },
      );

      Suppression.findOne.resolves(row({ reason: 'unknown', created_at: created }));
      const unknown = await list.getSuppressionData('a@example.com');
      assert.deepEqual(
        { ...unknown },
        { suppressed: true, info: { reason: 'fail', timestamp: created } },
      );
    });

    it('logs a query failure and reports the address unsuppressed', async function () {
      const failure = new Error('query failed');
      Suppression.findOne.rejects(failure);

      assert.deepEqual({ ...(await list.getSuppressionData('a@example.com')) }, unsuppressed);
      sinon.assert.calledOnceWithExactly(loggedError, failure);
    });

    it('logs a mapping failure and reports the address unsuppressed', async function () {
      // A row without a Date creation time fails the data class assertion.
      Suppression.findOne.resolves(row({ reason: 'spam', created_at: '2020-01-01' }));

      assert.deepEqual({ ...(await list.getSuppressionData('a@example.com')) }, unsuppressed);
      sinon.assert.calledOnce(loggedError);
      assert.equal(loggedError.firstCall.args[0].code, 'ERR_ASSERTION');
    });
  });

  describe('getBulkSuppressionData', function () {
    it('returns an empty array for no addresses without querying', async function () {
      assert.deepEqual(await list.getBulkSuppressionData([]), []);
      sinon.assert.notCalled(Suppression.findAll);
    });

    it('queries once with an interpolated filter and maps each input address in order', async function () {
      const created = new Date('2020-01-01T00:00:00Z');
      Suppression.findAll.resolves({
        models: [
          row({ email: 'b@example.com', reason: 'spam', created_at: created }),
          row({ email: 'a@example.com', reason: 'bounce', created_at: created }),
        ],
      });

      const result = await list.getBulkSuppressionData([
        'a@example.com',
        'c@example.com',
        'b@example.com',
        'a@example.com',
      ]);

      sinon.assert.calledOnceWithExactly(Suppression.findAll, {
        filter: "email:['a@example.com','c@example.com','b@example.com','a@example.com']",
      });
      assert.deepEqual(
        result.map((data: object) => ({ ...data })),
        [
          { suppressed: true, info: { reason: 'fail', timestamp: created } },
          unsuppressed,
          { suppressed: true, info: { reason: 'spam', timestamp: created } },
          // A duplicate input address maps to the same row again.
          { suppressed: true, info: { reason: 'fail', timestamp: created } },
        ],
      );
    });

    it('matches returned rows to inputs case-sensitively', async function () {
      Suppression.findAll.resolves({
        models: [row({ email: 'a@example.com', reason: 'spam', created_at: new Date() })],
      });

      const result = await list.getBulkSuppressionData(['A@example.com']);

      assert.deepEqual({ ...result[0] }, unsuppressed);
    });

    it('interpolates addresses into the filter without escaping quotes', async function () {
      // Pinned as current behaviour: the address is quoted but not escaped.
      await list.getBulkSuppressionData(["o'neil@example.com"]);

      sinon.assert.calledOnceWithExactly(Suppression.findAll, {
        filter: "email:['o'neil@example.com']",
      });
    });

    it('logs a query failure and reports every address unsuppressed', async function () {
      const failure = new Error('query failed');
      Suppression.findAll.rejects(failure);

      const result = await list.getBulkSuppressionData(['a@example.com', 'b@example.com']);

      assert.deepEqual(
        result.map((data: object) => ({ ...data })),
        [unsuppressed, unsuppressed],
      );
      sinon.assert.calledOnceWithExactly(loggedError, failure);
    });

    it('reports every address unsuppressed when one row fails to map', async function () {
      Suppression.findAll.resolves({
        models: [
          row({ email: 'a@example.com', reason: 'spam', created_at: new Date() }),
          row({ email: 'b@example.com', reason: 'spam', created_at: 'not a date' }),
        ],
      });

      const result = await list.getBulkSuppressionData(['a@example.com', 'b@example.com']);

      assert.deepEqual(
        result.map((data: object) => ({ ...data })),
        [unsuppressed, unsuppressed],
      );
      sinon.assert.calledOnce(loggedError);
    });
  });

  describe('removeEmail', function () {
    it('removes the bounce, complaint and unsubscribe in order, then deletes the local row', async function () {
      assert.equal(await list.removeEmail('a@example.com'), true);

      sinon.assert.calledOnceWithExactly(apiClient.removeBounce, 'a@example.com');
      sinon.assert.calledOnceWithExactly(apiClient.removeComplaint, 'a@example.com');
      sinon.assert.calledOnceWithExactly(apiClient.removeUnsubscribe, 'a@example.com');
      sinon.assert.calledOnceWithExactly(Suppression.destroy, {
        destroyBy: { email: 'a@example.com' },
      });
      sinon.assert.callOrder(
        apiClient.removeBounce,
        apiClient.removeComplaint,
        apiClient.removeUnsubscribe,
        Suppression.destroy,
      );
    });

    it('waits for each provider removal before starting the next', async function () {
      const bounce = Promise.withResolvers<boolean>();
      apiClient.removeBounce.returns(bounce.promise);

      const removal = list.removeEmail('a@example.com');
      // Drain runnable continuations while the bounce removal stays pending.
      await setImmediate();
      sinon.assert.notCalled(apiClient.removeComplaint);

      bounce.resolve(true);
      assert.equal(await removal, true);
      sinon.assert.calledOnce(apiClient.removeComplaint);
    });

    it('stops at the first throwing provider removal, keeps the local row and returns false', async function () {
      const failure = new Error('complaint removal failed');
      apiClient.removeComplaint.rejects(failure);

      assert.equal(await list.removeEmail('a@example.com'), false);

      sinon.assert.calledOnce(apiClient.removeBounce);
      sinon.assert.notCalled(apiClient.removeUnsubscribe);
      sinon.assert.notCalled(Suppression.destroy);
      sinon.assert.calledOnceWithExactly(loggedError, failure);
    });

    it('ignores false provider results, deletes the local row and returns true', async function () {
      // Pinned defect: the Mailgun client reports an unconfigured or failed removal
      // by resolving false, which removeEmail does not check.
      apiClient.removeBounce.resolves(false);
      apiClient.removeComplaint.resolves(false);
      apiClient.removeUnsubscribe.resolves(false);

      assert.equal(await list.removeEmail('a@example.com'), true);

      sinon.assert.calledOnce(Suppression.destroy);
    });

    it('logs a local deletion failure and returns false after the provider removals', async function () {
      const failure = new Error('delete failed');
      Suppression.destroy.rejects(failure);

      assert.equal(await list.removeEmail('a@example.com'), false);

      sinon.assert.calledOnce(apiClient.removeUnsubscribe);
      sinon.assert.calledOnceWithExactly(loggedError, failure);
    });
  });

  describe('single provider removals', function () {
    for (const method of ['removeUnsubscribe', 'removeComplaint'] as const) {
      it(`${method} resolves undefined after the provider call and leaves the local row`, async function () {
        assert.equal(await list[method]('a@example.com'), undefined);

        sinon.assert.calledOnceWithExactly(apiClient[method], 'a@example.com');
        sinon.assert.notCalled(Suppression.destroy);
        sinon.assert.notCalled(loggedError);
      });

      it(`${method} logs a provider failure and resolves false`, async function () {
        const failure = new Error('provider failed');
        apiClient[method].rejects(failure);

        assert.equal(await list[method]('a@example.com'), false);
        sinon.assert.calledOnceWithExactly(loggedError, failure);
      });
    }
  });

  describe('with the Mailgun client', function () {
    const DOMAIN = 'mg.example.com';
    let bulkEmail: unknown;

    function createListWithClient() {
      const client = new MailgunClient({
        config: { get: (key: string) => (key === 'bulkEmail' ? bulkEmail : undefined) },
        settings: { get: () => undefined },
      });
      return new MailgunEmailSuppressionList({
        Suppression,
        apiClient: client,
        ...collaborators(),
      });
    }

    beforeEach(function () {
      nock.disableNetConnect();
      bulkEmail = {
        mailgun: { apiKey: 'key', domain: DOMAIN, baseUrl: 'https://api.mailgun.net/v3' },
      };
    });

    afterEach(function () {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    it('deletes the bounce, complaint and unsubscribe for the primary domain in order', async function () {
      const paths: string[] = [];
      nock('https://api.mailgun.net')
        .persist()
        .delete(/.*/)
        .reply(200, (uri) => {
          paths.push(uri);
          return { message: 'deleted' };
        });

      assert.equal(await createListWithClient().removeEmail('a+b@example.com'), true);

      assert.deepEqual(paths, [
        `/v3/${DOMAIN}/bounces/a%2Bb%40example.com`,
        `/v3/${DOMAIN}/complaints/a%2Bb%40example.com`,
        `/v3/${DOMAIN}/unsubscribes/a%2Bb%40example.com`,
      ]);
      sinon.assert.calledOnce(Suppression.destroy);
    });

    it('reports success and deletes the local row when the provider is unconfigured', async function () {
      // Pinned defect: no provider request is made, but removeEmail returns true.
      bulkEmail = undefined;

      assert.equal(await createListWithClient().removeEmail('a@example.com'), true);

      assert.equal(nock.pendingMocks().length, 0);
      sinon.assert.calledOnce(Suppression.destroy);
    });

    it('reports success and deletes the local row when provider deletions fail', async function () {
      // Pinned defect: the client logs each failed deletion and resolves false,
      // and removeEmail still returns true.
      const clientLoggedError = sandbox.stub(clientLogging, 'error');
      const scope = nock('https://api.mailgun.net')
        .delete(/.*/)
        .times(3)
        .reply(500, { message: 'provider failed' });

      assert.equal(await createListWithClient().removeEmail('a@example.com'), true);

      assert.ok(scope.isDone());
      assert.equal(clientLoggedError.callCount, 3);
      sinon.assert.calledOnce(Suppression.destroy);
    });
  });

  describe('subscribe', function () {
    let subscribe: sinon.SinonStub;
    let dispatch: sinon.SinonStub;

    function handlerFor(Event: unknown, index = 0): Handler {
      const calls = subscribe.getCalls().filter((call) => call.args[0] === Event);
      return calls[index].args[1];
    }

    function bounce(error: unknown) {
      return EmailBouncedEvent.create({
        email: 'a@example.com',
        memberId: 'member-id',
        emailId: 'email-id',
        emailRecipientId: 'recipient-id',
        error: error as EmailBouncedEventType['error'],
        timestamp: new Date('2020-01-01T00:00:00Z'),
      });
    }

    beforeEach(function () {
      // Capture handlers rather than installing them on the shared bus.
      subscribe = sandbox.stub(DomainEvents, 'subscribe');
      dispatch = sandbox.stub(DomainEvents, 'dispatch');
    });

    it('keeps the injected model', function () {
      list.subscribe();
      assert.equal(list.Suppression, Suppression);
    });

    it('subscribes once to bounces and once to spam complaints', async function () {
      list.subscribe();

      sinon.assert.calledTwice(subscribe);
      assert.deepEqual(
        subscribe.getCalls().map((call) => call.args[0]),
        [EmailBouncedEvent, SpamComplaintEvent],
      );
      sinon.assert.notCalled(dispatch);
    });

    it('subscribes only once across repeated calls', function () {
      list.subscribe();
      list.subscribe();

      sinon.assert.calledTwice(subscribe);
    });

    it('deactivates the handler it added when a later registration fails, then registers again', async function () {
      const failure = new Error('subscribe failed');
      subscribe.onSecondCall().throws(failure);

      assert.throws(() => list.subscribe(), failure);
      await handlerFor(EmailBouncedEvent, 0)(bounce({ code: 605, message: 'suppressed' }));
      sinon.assert.notCalled(Suppression.add);
      sinon.assert.notCalled(dispatch);

      list.subscribe();
      sinon.assert.callCount(subscribe, 4);
      await handlerFor(EmailBouncedEvent, 1)(bounce({ code: 605, message: 'suppressed' }));
      sinon.assert.calledOnce(Suppression.add);
      sinon.assert.calledOnce(dispatch);
    });

    it('stores a spam complaint, then dispatches a suppression event with its time', async function () {
      list.subscribe();
      const timestamp = new Date('2020-01-01T00:00:00Z');
      const order: string[] = [];
      Suppression.add.callsFake(async () => {
        order.push('add');
      });
      dispatch.callsFake(() => {
        order.push('dispatch');
      });

      await handlerFor(SpamComplaintEvent)(
        SpamComplaintEvent.create({
          email: 'a@example.com',
          memberId: 'member-id',
          emailId: 'email-id',
          timestamp,
        }),
      );

      sinon.assert.calledOnceWithExactly(Suppression.add, {
        email: 'a@example.com',
        email_id: 'email-id',
        reason: 'spam',
        created_at: timestamp,
      });
      assert.deepEqual(order, ['add', 'dispatch']);
      const event = dispatch.firstCall.args[0];
      assert.ok(event instanceof EmailSuppressedEvent);
      assert.deepEqual(event.data, {
        emailAddress: 'a@example.com',
        emailId: 'email-id',
        reason: 'spam',
      });
      assert.equal(event.timestamp, timestamp);
    });

    it('handlers use the model current when the event arrives', async function () {
      list.subscribe();
      const later = createSuppressionModel();
      list.Suppression = later;

      await handlerFor(SpamComplaintEvent)(
        SpamComplaintEvent.create({ email: 'a@example.com', memberId: 'm', emailId: 'e' }),
      );

      sinon.assert.calledOnce(later.add);
      sinon.assert.notCalled(Suppression.add);
    });

    for (const code of [605, 607]) {
      it(`stores and dispatches a bounce with Mailgun suppression code ${code}`, async function () {
        list.subscribe();
        const event = bounce({ code, message: 'suppressed' });

        await handlerFor(EmailBouncedEvent)(event);

        sinon.assert.calledOnceWithExactly(Suppression.add, {
          email: 'a@example.com',
          email_id: 'email-id',
          reason: 'bounce',
          created_at: event.timestamp,
        });
        sinon.assert.calledOnce(dispatch);
        assert.deepEqual(dispatch.firstCall.args[0].data, {
          emailAddress: 'a@example.com',
          emailId: 'email-id',
          reason: 'bounce',
        });
      });
    }

    for (const [label, error] of [
      ['no error', null],
      ['no code', { message: 'failed' }],
      ['a string code', { code: '605', message: 'failed' }],
      ['a fractional code', { code: 605.5, message: 'failed' }],
    ] as const) {
      it(`ignores a bounce with ${label}`, async function () {
        list.subscribe();

        await handlerFor(EmailBouncedEvent)(bounce(error));

        sinon.assert.notCalled(Suppression.add);
        sinon.assert.notCalled(dispatch);
      });
    }

    it('ignores an integer bounce code that does not identify an undeliverable address', async function () {
      list.subscribe();

      await handlerFor(EmailBouncedEvent)(
        bounce({ code: 554, enhancedCode: '5.7.1', message: '5.7.1 Message rejected as spam' }),
      );

      sinon.assert.notCalled(Suppression.add);
      sinon.assert.notCalled(dispatch);
    });

    for (const code of ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT']) {
      it(`still dispatches when the row already exists (${code})`, async function () {
        list.subscribe();
        Suppression.add.rejects(Object.assign(new Error('duplicate'), { code }));

        await handlerFor(EmailBouncedEvent)(bounce({ code: 605, message: 'suppressed' }));

        sinon.assert.calledOnce(dispatch);
        sinon.assert.calledOnce(loggedInfo);
        assert.match(loggedInfo.firstCall.args[0], /Re-dispatching .* \(bounce\): a@example\.com/);
        sinon.assert.notCalled(loggedError);
      });
    }

    it('logs any other storage failure and does not dispatch', async function () {
      list.subscribe();
      const failure = Object.assign(new Error('storage failed'), { code: 'ER_LOCK_DEADLOCK' });
      Suppression.add.rejects(failure);

      await handlerFor(SpamComplaintEvent)(
        SpamComplaintEvent.create({ email: 'a@example.com', memberId: 'm', emailId: 'e' }),
      );

      sinon.assert.calledOnceWithExactly(loggedError, failure);
      sinon.assert.notCalled(dispatch);
    });
  });
});
