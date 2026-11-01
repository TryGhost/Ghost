import nock from 'nock';
import stripe from 'stripe';
import ObjectId from 'bson-objectid';
import { vi } from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { mockSystemTime } from '../../utils/clock-utils';
// @ts-expect-error This module lacks type definitions.
import DomainEvents from '@tryghost/domain-events';
import * as db from '../../../core/server/data/db';
// @ts-expect-error This module lacks type definitions.
import models from '../../../core/server/models';
import adapterManager from '../../../core/server/services/adapter-manager';
import { getSignedAdminToken } from '../../../core/server/adapters/scheduling/utils';
// @ts-expect-error This module lacks type definitions.
import mailService from '../../../core/server/lib/mail';
import type {
  Automation,
  AutomationAction,
  AutomationSummary,
} from '../../../core/server/services/automations/automations-repository';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../core/server/services/member-welcome-emails/constants';
import membersService from '../../../core/server/services/members';
import {
  cleanupAutomationsFixture,
  setupAutomationsFixture,
} from '../../utils/automations-fixtures';

// Share the same CommonJS instances Ghost uses.
const {
  agentProvider,
  fixtureManager,
  mockManager,
}: typeof import('../../utils/e2e-framework') = require('../../utils/e2e-framework');
const MailgunClient = require('../../../core/server/lib/mailgun/mailgun-client');

const HOUR_MS = 60 * 60 * 1000;
const AUTOMATION_EMAIL_REPLY_TO = 'support@example.com';

let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
let membersAgent: Awaited<ReturnType<typeof agentProvider.getAgentsForMembers>>['membersAgent'];
let schedulerKey: Parameters<typeof getSignedAdminToken>[0]['key'];
let mailgunSend: sinon.SinonStub;

async function getFreeMemberSignupAutomation(): Promise<Automation> {
  const {
    body: { automations },
  } = await agent.get('automations').expectStatus(200);
  const summary = automations.find(
    (automation: AutomationSummary) => automation.slug === MEMBER_WELCOME_EMAIL_SLUGS.free,
  );
  assert(summary, 'Expected free member signup automation to exist');

  const { body } = await agent.get(`automations/${summary.id}`).expectStatus(200);
  return body.automations[0];
}

function getSchedulerToken() {
  return getSignedAdminToken({
    publishedAt: new Date().toISOString(),
    apiUrl: '/admin/',
    key: schedulerKey,
  });
}

async function runSchedulerPoll() {
  await agent
    .put(`automations/poll/?token=${getSchedulerToken()}`)
    .expectStatus(204)
    .expectEmptyBody();
  await DomainEvents.allSettled();
}

async function upsertEmailDesignSetting({
  id,
  senderReplyTo,
}: {
  id: string;
  senderReplyTo: string;
}) {
  const currentTime = new Date();

  await db
    .knex('email_design_settings')
    .insert({
      id,
      slug: `automation-test-email-design-${id}`,
      background_color: 'light',
      header_background_color: 'transparent',
      show_header_icon: true,
      show_header_title: true,
      button_color: 'accent',
      button_corners: 'rounded',
      button_style: 'fill',
      link_color: 'accent',
      link_style: 'underline',
      body_font_category: 'sans_serif',
      title_font_category: 'sans_serif',
      title_font_weight: 'bold',
      image_corners: 'square',
      show_badge: true,
      sender_reply_to: senderReplyTo,
      created_at: currentTime,
      updated_at: currentTime,
    })
    .onConflict('id')
    .merge({
      sender_reply_to: senderReplyTo,
      updated_at: currentTime,
    });
}

function serializeEditableAction(action: AutomationAction) {
  if (action.type !== 'send_email') {
    return action;
  }

  return {
    id: action.id,
    type: action.type,
    data: {
      email_subject: action.data.email_subject,
      email_lexical: action.data.email_lexical,
      email_design_setting_id: action.data.email_design_setting_id,
    },
  };
}

async function updateAutomationEmailDesignSetting(
  automation: Automation,
  emailDesignSettingId: string,
): Promise<Automation> {
  const actions = automation.actions.map((action) => {
    if (action.type !== 'send_email') {
      return action;
    }

    const editableAction = serializeEditableAction(action);
    return {
      ...editableAction,
      data: {
        ...editableAction.data,
        email_design_setting_id: emailDesignSettingId,
      },
    };
  });

  const { body } = await agent
    .put(`automations/${automation.id}`)
    .body({
      automations: [
        {
          status: automation.status,
          actions,
          edges: automation.edges,
        },
      ],
    })
    .expectStatus(200);

  return body.automations[0];
}

async function updateAutomation(
  automation: Automation,
  overrides: Partial<Automation> = {},
): Promise<Automation> {
  const { body } = await agent
    .put(`automations/${automation.id}`)
    .body({
      automations: [
        {
          status: automation.status,
          actions: automation.actions.map(serializeEditableAction),
          edges: automation.edges,
          ...overrides,
        },
      ],
    })
    .expectStatus(200);

  return body.automations[0];
}

function getAutomationEmailSends() {
  return mailgunSend.getCalls().filter((call) => call.args[0].tags?.includes('automation-email'));
}

async function getEmailSentCounts(actions: AutomationAction[]) {
  const actionIds = actions.map((action) => action.id);
  const rows = await db
    .knex('automation_action_revisions')
    .select('action_id', 'email_sent_count')
    .whereIn('action_id', actionIds);

  const countsByActionId = new Map(rows.map((row) => [row.action_id, row.email_sent_count]));

  return actionIds.map((actionId) => countsByActionId.get(actionId));
}

async function runAutomationForFreeMember(automation: Automation, email: string) {
  // Freeze to a round second to match database precision. (Real production code works fine.)
  const clock = mockSystemTime(new Date('2026-01-01T12:00:00.000Z'));

  try {
    const member = await membersService.api.members.create({
      email,
      name: 'Automation Test Member',
      status: 'free',
      email_disabled: false,
    });
    assert.equal(member.get('status'), 'free');

    await DomainEvents.allSettled();

    for (const action of automation.actions) {
      if (action.type === 'wait') {
        clock.setSystemTime(new Date(Date.now() + action.data.wait_hours * HOUR_MS));
      }

      await runSchedulerPoll();
    }

    await runSchedulerPoll();
  } finally {
    clock.restore();
  }
}

describe('automations', function () {
  beforeAll(async function () {
    ({ adminAgent: agent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('users', 'integrations', 'api_keys', 'members');
    await agent.loginAsOwner();

    schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
  });

  beforeEach(async function () {
    mockManager.mockLabsEnabled('automations');
    const schedulerAdapter = adapterManager.getAdapter('scheduling');
    sinon.stub(schedulerAdapter, 'schedule');
    assert('_pingUrl' in schedulerAdapter);
    sinon.stub(schedulerAdapter, '_pingUrl');
    mailgunSend = sinon
      .stub(MailgunClient.prototype, 'send')
      .resolves({ id: '<bulk-mailgun-message-id>' });
    sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
    await setupAutomationsFixture();
  });

  afterEach(async function () {
    await DomainEvents.allSettled();
    sinon.restore();
    mockManager.restore();
    await cleanupAutomationsFixture();
  });

  it('returns descriptions when browsing and reading automations', async function () {
    const description = 'Welcome new free members with a short email sequence';
    await db
      .knex('automations')
      .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
      .update({ description });

    const { body: browseBody } = await agent.get('automations').expectStatus(200);
    const summary = browseBody.automations.find(
      (automation: AutomationSummary) => automation.slug === MEMBER_WELCOME_EMAIL_SLUGS.free,
    );
    assert(summary);
    assert.equal(summary.description, description);

    const { body: readBody } = await agent.get(`automations/${summary.id}`).expectStatus(200);
    assert.equal(readBody.automations[0].description, description);
  });

  it('runs every step in the free member signup automation', async function () {
    let automation = await getFreeMemberSignupAutomation();
    assert.equal(automation.actions.length, 4);

    const sendEmailActions = automation.actions.filter((action) => action.type === 'send_email');
    assert.equal(sendEmailActions.length, 2);
    assert.deepEqual(await getEmailSentCounts(sendEmailActions), [null, null]);

    const emailDesignSettingId = sendEmailActions[0].data.email_design_setting_id;
    assert(emailDesignSettingId, 'Expected send email action to have an email design setting');
    await upsertEmailDesignSetting({
      id: emailDesignSettingId,
      senderReplyTo: AUTOMATION_EMAIL_REPLY_TO,
    });

    automation = await updateAutomationEmailDesignSetting(automation, emailDesignSettingId);
    assert.deepEqual(
      automation.actions
        .filter((action) => action.type === 'send_email')
        .map((action) => action.data.email_design_setting_id),
      [emailDesignSettingId, emailDesignSettingId],
    );

    const email = `automation-free-member-${Date.now()}@test.example`;
    await runAutomationForFreeMember(automation, email);

    const sendCalls = getAutomationEmailSends();
    const sentEmails = sendCalls.map((call) => call.args[0]);
    assert.equal(sendCalls.length, 2);
    assert.deepEqual(
      sendCalls.map((call) => Object.keys(call.args[1])),
      [[email], [email]],
    );
    assert.deepEqual(
      sentEmails.map(({ subject }) => subject),
      ['Welcome!', 'Follow up'],
    );
    assert.match(sentEmails[0].html, /Welcome!/);
    assert.match(sentEmails[1].html, /Follow up/);
    assert.match(sentEmails[0].plaintext, /Lorem ipsum\./);
    assert.match(sentEmails[1].plaintext, /Lorem ipsum\./);
    assert.deepEqual(
      sentEmails.map(({ replyTo }) => replyTo),
      [AUTOMATION_EMAIL_REPLY_TO, AUTOMATION_EMAIL_REPLY_TO],
    );
    assert.deepEqual(
      sentEmails.map(({ tags }) => tags),
      [['automation-email'], ['automation-email']],
    );
    sinon.assert.calledWithMatch(
      MailgunClient.prototype.send,
      {
        subject: 'Welcome!',
      },
      {
        [email]: sinon.match.object,
      },
    );
    sinon.assert.calledWithMatch(
      MailgunClient.prototype.send,
      {
        subject: 'Follow up',
      },
      {
        [email]: sinon.match.object,
      },
    );
    assert.deepEqual(await getEmailSentCounts(sendEmailActions), [1, 1]);

    const secondEmail = `automation-second-free-member-${Date.now()}@test.example`;
    await runAutomationForFreeMember(automation, secondEmail);

    assert.deepEqual(await getEmailSentCounts(sendEmailActions), [2, 2]);
  });

  it('does nothing when the automation is inactive', async function () {
    const automation = await getFreeMemberSignupAutomation();
    await updateAutomation(automation, { status: 'inactive' });

    const email = `automation-free-member-${Date.now()}@test.example`;
    const member = await membersService.api.members.create({
      email,
      name: 'Inactive Automation Test Member',
      status: 'free',
      email_disabled: false,
    });
    assert.equal(member.get('status'), 'free');

    await DomainEvents.allSettled();
    await runSchedulerPoll();

    assert.equal(getAutomationEmailSends().length, 0);
  });

  it('stops an automation run when its automation is deactivated before poll', async function () {
    const automation = await getFreeMemberSignupAutomation();
    const firstWaitAction = automation.actions.find((action) => action.type === 'wait');
    assert(firstWaitAction, 'Expected free automation to start with a wait action');

    const email = `automation-free-member-${Date.now()}@test.example`;
    const member = await membersService.api.members.create({
      email,
      name: 'Disabled Step Test Member',
      status: 'free',
      email_disabled: false,
    });
    assert.equal(member.get('status'), 'free');

    await DomainEvents.allSettled();
    await updateAutomation(automation, { status: 'inactive' });

    const clock = mockSystemTime(new Date());

    try {
      clock.setSystemTime(new Date(Date.now() + firstWaitAction.data.wait_hours * HOUR_MS));
      await runSchedulerPoll();
    } finally {
      clock.restore();
    }

    assert.equal(getAutomationEmailSends().length, 0);
  });

  it('stops an automation run when the associated member changes their status', async function () {
    const automation = await getFreeMemberSignupAutomation();
    const firstWaitAction = automation.actions.find((action) => action.type === 'wait');
    assert(firstWaitAction, 'Expected free automation to start with a wait action');

    const email = `automation-status-changed-${Date.now()}@test.example`;
    const member = await membersService.api.members.create({
      email,
      name: 'Changed Status Test Member',
      status: 'free',
      email_disabled: false,
    });
    assert.equal(member.get('status'), 'free');
    await DomainEvents.allSettled();

    await db.knex('members').where('id', member.id).update({
      status: 'paid',
      updated_at: new Date(),
    });

    const clock = mockSystemTime(new Date());

    try {
      clock.setSystemTime(new Date(Date.now() + firstWaitAction.data.wait_hours * HOUR_MS));
      await runSchedulerPoll();
    } finally {
      clock.restore();
    }

    assert.equal(getAutomationEmailSends().length, 0);
  });

  describe('paid subscription triggers', function () {
    let memberId: string;
    let customer: {
      id: string;
      email: string;
      invoice_settings: object;
      subscriptions: { data: unknown[] };
    };
    let subscription: {
      id: string;
      customer: string;
      status: string;
      cancel_at_period_end: boolean;
      start_date: number;
      current_period_end: number;
      canceled_at?: number;
      items: {
        data: {
          price: {
            id: string;
            product: string;
            active: boolean;
            nickname: string;
            currency: string;
            recurring: { interval: string };
            unit_amount: number;
            type: string;
          };
        }[];
      };
      metadata: Record<string, string>;
    };

    beforeEach(async function () {
      const customerId = `cus_${ObjectId().toHexString()}`;
      const response = await agent
        .post('/members/')
        .body({ members: [{ email: `${customerId}@example.com`, subscribed: false }] })
        .expectStatus(201);
      memberId = response.body.members[0].id;
      await models.MemberStripeCustomer.add({ member_id: memberId, customer_id: customerId });
      customer = {
        id: customerId,
        email: response.body.members[0].email,
        invoice_settings: {},
        subscriptions: { data: [] },
      };
      const now = Math.floor(Date.now() / 1000);
      subscription = {
        id: `sub_${ObjectId().toHexString()}`,
        customer: customerId,
        status: 'active',
        cancel_at_period_end: false,
        start_date: now,
        current_period_end: now + 86400 * 31,
        items: {
          data: [
            {
              price: {
                id: 'price_123',
                product: 'product_123',
                active: true,
                nickname: 'month',
                currency: 'usd',
                recurring: { interval: 'month' },
                unit_amount: 150,
                type: 'recurring',
              },
            },
          ],
        },
        metadata: {},
      };
      nock('https://api.stripe.com')
        .post('/v1/prices/price_123')
        .reply(200, subscription.items.data[0].price)
        .persist();
      nock('https://api.stripe.com')
        .post('/v1/products/product_123')
        .reply(200, { id: 'product_123', active: true })
        .persist();
      nock('https://api.stripe.com')
        .post('/v1/products')
        .reply(200, { id: 'product_123', active: true })
        .persist();
      nock('https://api.stripe.com')
        .post('/v1/prices')
        .reply(200, subscription.items.data[0].price)
        .persist();
      nock('https://api.stripe.com')
        .get(`/v1/subscriptions/${subscription.id}`)
        .query(true)
        .reply(() => [200, subscription])
        .persist();
      nock('https://api.stripe.com')
        .get(`/v1/customers/${customerId}`)
        .query(true)
        .reply(() => [200, customer])
        .persist();
    });

    afterEach(function () {
      nock.cleanAll();
    });

    async function deliver(type: string) {
      const payload = JSON.stringify({
        type,
        api_version: '2020-08-27',
        data: { object: subscription },
      });
      const secret = process.env.WEBHOOK_SECRET;
      assert(secret, 'Expected webhook signing secret');
      const signature = new stripe('sk_test_automations', {
        apiVersion: '2020-08-27',
      }).webhooks.generateTestHeaderString({
        payload,
        secret,
      });
      await membersAgent
        .post('/webhooks/stripe/')
        .body(payload)
        .header('content-type', 'application/json')
        .header('stripe-signature', signature)
        .expectStatus(200);
      await DomainEvents.allSettled();
    }

    async function getPaidAutomation() {
      return await db.knex('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).first();
    }

    function getRuns(automationId: string) {
      return db.knex('automation_runs').where({ automation_id: automationId, member_id: memberId });
    }

    async function assertEnrollment(automationId: string) {
      const automation = { id: automationId };
      const runs = () =>
        db.knex('automation_runs').where({ automation_id: automationId, member_id: memberId });
      await vi.waitFor(async () => assert.equal((await runs()).length, 1));
      const [run] = await runs();
      assert.equal(run.member_email, customer.email);
      const steps = await db.knex('automation_run_steps').where('automation_run_id', run.id);
      assert.equal(steps.length, 1);
      const revision = await db
        .knex('automation_action_revisions')
        .where('id', steps[0].automation_action_revision_id)
        .first();
      assert.equal(
        revision.action_id,
        (
          await db
            .knex('automation_actions')
            .where('automation_id', automation.id)
            .orderBy('created_at')
            .first()
        ).id,
      );
    }

    it('enrolls once when a paid subscription starts', async function () {
      const automation = await getPaidAutomation();
      assert.equal((await getRuns(automation.id)).length, 0);
      await deliver('customer.subscription.created');
      assert.equal((await models.Member.findOne({ id: memberId })).get('status'), 'paid');
      await assertEnrollment(automation.id);
      await deliver('customer.subscription.created');
      assert.equal((await getRuns(automation.id)).length, 1);
      await deliver('customer.subscription.updated');
      assert.equal((await getRuns(automation.id)).length, 1);
    });
  });
});
