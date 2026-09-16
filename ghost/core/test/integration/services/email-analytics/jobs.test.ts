import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import { vi } from 'vitest';
import type { Knex } from 'knex';

const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const { knex }: { knex: Knex } = require('../../../utils');
const emailAnalytics = require('../../../../core/server/services/email-analytics');
const jobsService = require('../../../../core/server/services/jobs-service');
const MailgunClient = require('../../../../core/server/services/lib/mailgun-client');
const logging = require('@tryghost/logging');
const EmailAnalyticsFetchLatestJob =
  require('../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job').default;

type MailgunEvent = {
  id: string;
  event: string;
  recipient: string;
  tags: string[];
  timestamp: number;
  message: { headers: { 'message-id': string } };
  'user-variables'?: { 'email-id': string };
};

const eventDate = new Date('2024-01-01T00:00:00Z');
const cursorDate = new Date('2023-12-31T23:59:00Z');
const namespaces = ['email-analytics', 'email-analytics-automation', 'email-analytics-gifts'];

describe('email analytics JobsService delivery', function () {
  let events: MailgunEvent[];
  let info: sinon.SinonSpy;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
  });

  beforeEach(async function () {
    events = [];
    info = sinon.spy(logging, 'info');
    for (const prefix of namespaces) {
      for (const suffix of ['latest-others', 'latest-opened', 'missing']) {
        await knex('jobs')
          .insert({
            id: ObjectId().toHexString(),
            name: `${prefix}-${suffix}`,
            created_at: cursorDate,
            started_at: cursorDate,
            finished_at: cursorDate,
            status: 'finished',
          })
          .onConflict('name')
          .merge({ started_at: cursorDate, finished_at: cursorDate, status: 'finished' });
      }
    }
    for (const wrapper of [
      emailAnalytics.getNewsletters(),
      emailAnalytics.getAutomations(),
      emailAnalytics.getGifts(),
    ]) {
      for (const data of Object.values(wrapper.service.getStatus()) as Array<{
        lastEventTimestamp?: Date;
        lastBegin?: Date;
      }>) {
        delete data.lastEventTimestamp;
        delete data.lastBegin;
      }
    }
    sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (
      this: { normalizeEvent: (event: MailgunEvent) => unknown },
      ...args: unknown[]
    ) {
      const [options, batchHandler] = args as [
        { event: string; tags: string; begin?: number; end?: number },
        (events: unknown[]) => Promise<unknown>,
      ];
      const matching = events.filter(
        (event) =>
          options.event.split(' OR ').includes(event.event) &&
          options.tags.split(' AND ').every((tag) => event.tags.includes(tag)) &&
          (options.begin === undefined || event.timestamp >= options.begin) &&
          (options.end === undefined || event.timestamp <= options.end),
      );
      return matching.length
        ? [await batchHandler(matching.map((event) => this.normalizeEvent(event)).filter(Boolean))]
        : [];
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  function mailgunEvent(
    type: string,
    messageId: string,
    recipient: string,
    tag: string,
  ): MailgunEvent {
    return {
      id: `${type}-${messageId}`,
      event: type,
      recipient,
      tags: [tag],
      timestamp: eventDate.getTime() / 1000,
      message: { headers: { 'message-id': `<${messageId.replace(/^<|>$/g, '')}>` } },
    };
  }

  async function dispatchAndWait(job: object, type: string, prefix: string) {
    const siblings = await knex('jobs')
      .whereIn(
        'name',
        namespaces
          .filter((name) => name !== prefix)
          .flatMap((name) =>
            ['latest-others', 'latest-opened', 'missing'].map((suffix) => `${name}-${suffix}`),
          ),
      )
      .orderBy('name');
    await jobsService.getInstance().dispatch(job);
    await vi.waitFor(
      () => {
        assert.ok(
          info.args.some(
            ([payload]) => payload?.system?.event === `${type.replaceAll('-', '_')}.completed`,
          ),
        );
      },
      { timeout: 5000, interval: 20 },
    );
    const cursor = await knex('jobs').where('name', `${prefix}-latest-others`).first();
    assert.ok(new Date(cursor.finished_at) > cursorDate);
    const after = await knex('jobs')
      .whereIn(
        'name',
        siblings.map((row) => row.name),
      )
      .orderBy('name');
    assert.deepEqual(after, siblings);
  }

  it('persists newsletter delivery, opens, aggregation, and its cursor through the booted backend', async function () {
    const recipient = fixtureManager.get('email_recipients', 0);
    const batch = fixtureManager.get('email_batches', 0);
    await knex('email_recipients')
      .where('id', recipient.id)
      .update({ delivered_at: null, opened_at: null });
    events = ['opened', 'delivered'].map((type) => ({
      ...mailgunEvent(type, batch.mailgun_message_id, recipient.member_email, 'bulk-email'),
      'user-variables': { 'email-id': batch.email_id },
    }));
    await dispatchAndWait(
      new EmailAnalyticsFetchLatestJob(),
      EmailAnalyticsFetchLatestJob.type,
      'email-analytics',
    );
    const updated = await knex('email_recipients').where('id', recipient.id).first();
    assert.equal(new Date(updated.delivered_at).getTime(), eventDate.getTime());
    assert.equal(new Date(updated.opened_at).getTime(), eventDate.getTime());
    const email = await knex('emails').where('id', batch.email_id).first();
    assert.ok(email.delivered_count > 0);
    assert.ok(email.opened_count > 0);
  });
});
