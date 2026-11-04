import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const i18nLib = require('@tryghost/i18n').default;
const settingsCache = require('../../../../../core/shared/settings-cache');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const events = require('../../../../../core/server/lib/common/events');
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/lib/mail');
const MailgunClient = require('../../../../../core/server/lib/mailgun/mailgun-client');
const lexicalLib = require('../../../../../core/server/lib/lexical');
const emailAddressService = require('../../../../../core/server/services/email-address');
const linkTracking = require('../../../../../core/server/services/link-tracking');
const StripeService = require('../../../../../core/server/services/stripe/stripe-service');
const automatedEmails = require('../../../../../core/server/api/endpoints/automated-emails');
const automationEmailPreviews = require('../../../../../core/server/api/endpoints/automation-email-previews');
const constants = require('../../../../../core/server/services/member-welcome-emails/constants');
const MemberWelcomeEmailService = require('../../../../../core/server/services/member-welcome-emails/member-welcome-email-service');
const root = require('../../../../../core/server/services/member-welcome-emails').default;

const { MESSAGES } = constants;

type Attributes = Record<string, unknown>;

type FakeModel = {
  id: unknown;
  get: (key: string) => unknown;
  related: (key: string) => FakeModel | undefined;
  toJSON: () => Attributes;
};

function fakeModel(
  attrs: Attributes,
  related: Record<string, FakeModel | undefined> = {},
): FakeModel {
  return {
    id: attrs.id,
    get: (key) => attrs[key],
    related: (key) => related[key],
    toJSON: () => ({ ...attrs }),
  };
}

const lexical = (text: string) =>
  JSON.stringify({
    root: {
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });

const member = {
  name: 'Jamie Larson',
  email: 'jamie@example.com',
  uuid: '00000000-0000-4000-8000-000000000001',
};

const designSettings = fakeModel({ id: 'design-id', sender_name: null, sender_reply_to: null });

function welcomeRow({ subject = 'Welcome to {site_title}', status = 'active' } = {}) {
  return fakeModel(
    { id: 'automation-id', status },
    {
      welcomeEmailAutomatedEmail: fakeModel(
        { id: 'email-id', lexical: lexical('Hello'), subject },
        { emailDesignSetting: designSettings },
      ),
    },
  );
}

function newsletter(sender: string) {
  return fakeModel({
    sender_name: `${sender} Sender`,
    sender_email: `${sender.toLowerCase()}@example.com`,
    sender_reply_to: `${sender.toLowerCase()}-reply@example.com`,
  });
}

const automationEmail = {
  email: { designSettingId: 'design-id', lexical: lexical('Hello'), subject: 'Automation' },
  member,
  memberStatus: 'free',
  trackOpens: true,
  trackClicks: false,
  automationActionRevisionId: 'revision-id',
  automationRunStepId: 'step-id',
};

// The root retains one instance for the process. The initialization suite boots it first, and
// later suites boot it themselves when run alone, always through a stubbed emitter so the shared
// bus never gets a listener from this file. They reload it to reset the caches they exercise.
describe('Member welcome emails root', function () {
  const settings: Attributes = {};
  let sendTransactional: sinon.SinonStub;
  let localeListener: (model: { get: (key: string) => string }) => unknown;

  beforeAll(function () {
    emailAddressService.init();
  });

  beforeEach(function () {
    Object.assign(settings, { title: 'Test Site', locale: 'en', accent_color: '#15212A' });
    sinon.stub(settingsCache, 'get').callsFake((key) => settings[key as string]);
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');
    sinon.stub(lexicalLib, 'render').resolves('<p>Hello</p>');
    sendTransactional = sinon.stub(mail.GhostMailer.prototype, 'send').resolves('Mail sent');
  });

  afterEach(function () {
    sinon.restore();
    for (const key of Object.keys(settings)) {
      delete settings[key];
    }
  });

  // init is idempotent, so after the initialization suite this only returns the retained instance.
  async function initRoot() {
    const on = sinon.stub(events, 'on');
    sinon.define(linkTracking, 'service', { addAutomationTrackingToUrl: sinon.stub() });
    try {
      await root.init();
    } finally {
      on.restore();
    }
  }

  describe('initialization', function () {
    it('exposes only init and a guarded service getter', function () {
      assert.deepEqual(Object.keys(root).sort(), ['init', 'service']);
      assert.equal(typeof root.init, 'function');
      assert.throws(() => root.service, {
        errorType: 'IncorrectUsageError',
        message: /Member welcome emails used before init\(\)/,
      });
    });

    it('rejects init while link tracking is not ready and leaves no locale listener behind', async function () {
      const on = sinon.stub(events, 'on');

      await assert.rejects(root.init(), /Link tracking must be initialized/);

      sinon.assert.notCalled(on);
      assert.throws(() => root.service, { errorType: 'IncorrectUsageError' });
    });

    it('builds the service for the configured locale with one locale listener once dependencies are ready', async function () {
      settings.locale = 'fr';
      sinon.define(linkTracking, 'service', { addAutomationTrackingToUrl: sinon.stub() });
      const on = sinon.stub(events, 'on');

      await root.init();

      sinon.assert.calledOnceWithExactly(on, 'settings.locale.edited', sinon.match.func);
      localeListener = on.firstCall.args[1];
      assert.ok(root.service instanceof MemberWelcomeEmailService);
    });

    it('retains the same instance and listener across repeated init', async function () {
      const on = sinon.stub(events, 'on');
      const service = root.service;

      await root.init();
      await Promise.all([root.init(), root.init()]);

      assert.equal(root.service, service);
      sinon.assert.notCalled(on);
    });

    it('has no welcome content to send until loadMemberWelcomeEmails runs', async function () {
      const findAutomation = sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());

      await assert.rejects(root.service.send({ member, memberStatus: 'free' }), {
        message: MESSAGES.NO_MEMBER_WELCOME_EMAIL,
      });

      sinon.assert.notCalled(findAutomation);
      sinon.assert.notCalled(sendTransactional);
    });

    it('renders with the translator it built for the configured locale and follows locale edits', async function () {
      sinon.stub(models.Newsletter, 'getDefaultNewsletter').resolves(newsletter('First'));
      sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      await root.service.loadMemberWelcomeEmails();
      const french = i18nLib('fr', 'ghost').t('Manage your preferences');
      assert.notEqual(french, 'Manage your preferences');

      await root.service.send({ member, memberStatus: 'free' });
      await localeListener({ get: (key) => (key === 'value' ? 'en' : '') });
      await root.service.send({ member, memberStatus: 'free' });

      // The HTML entity-encodes accents, so the finalized plaintext carries the footer label.
      assert.ok(sendTransactional.firstCall.args[0].text.includes(french));
      assert.ok(sendTransactional.secondCall.args[0].text.includes('Manage your preferences'));
    });
  });

  describe('ready service consumers', function () {
    let api: Record<string, sinon.SinonStub>;

    beforeEach(function () {
      api = {
        isMemberWelcomeEmailActive: sinon.stub().resolves(true),
        previewEmail: sinon.stub().resolves({ html: '<p>Preview</p>' }),
        sendTestEmail: sinon.stub().resolves(),
        editSharedSenderOptions: sinon.stub().resolves({ data: [], meta: {} }),
        verifySenderPropertyUpdate: sinon.stub().resolves({ data: [], meta: {} }),
        previewAutomationEmail: sinon.stub().resolves({ html: '<p>Preview</p>' }),
        sendTestAutomationEmail: sinon.stub().resolves(),
      };
      sinon.stub(root, 'service').get(() => api);
      sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
    });

    it('lets Stripe ask the ready service whether the paid welcome email is active', async function () {
      const stripe = new StripeService({
        labs: {},
        tracking: {},
        membersService: {},
        donationService: {},
        giftService: {},
        staffService: {},
        StripeWebhook: {},
        settingsCache: {},
        models: { Settings: {} },
      });

      const active =
        await stripe.webhookController.checkoutSessionEventService.deps.isPaidWelcomeEmailActive();

      assert.equal(active, true);
      sinon.assert.calledOnceWithExactly(api.isMemberWelcomeEmailActive, 'paid');
    });

    const frame = {
      options: { id: 'automation-id' },
      data: {
        email: 'jamie@example.com',
        subject: 'Welcome',
        lexical: lexical('Hello'),
        token: 'verify-token',
        sender_name: 'Sender',
        sender_email: 'sender@example.com',
        sender_reply_to: 'reply@example.com',
      },
    };

    for (const [endpoint, controller, method, expected] of [
      [
        'automated_emails.preview',
        automatedEmails.preview,
        'previewEmail',
        { subject: 'Welcome', lexical: lexical('Hello'), automatedEmailId: 'automation-id' },
      ],
      [
        'automated_emails.sendTestEmail',
        automatedEmails.sendTestEmail,
        'sendTestEmail',
        {
          email: 'jamie@example.com',
          subject: 'Welcome',
          lexical: lexical('Hello'),
          automatedEmailId: 'automation-id',
        },
      ],
      [
        'automated_emails.editSenders',
        automatedEmails.editSenders,
        'editSharedSenderOptions',
        {
          sender_name: 'Sender',
          sender_email: 'sender@example.com',
          sender_reply_to: 'reply@example.com',
        },
      ],
      [
        'automated_emails.verifySenderUpdate',
        automatedEmails.verifySenderUpdate,
        'verifySenderPropertyUpdate',
        'verify-token',
      ],
      [
        'automation_email_previews.preview',
        automationEmailPreviews.preview,
        'previewAutomationEmail',
        { automationId: 'automation-id', subject: 'Welcome', lexical: lexical('Hello') },
      ],
      [
        'automation_email_previews.sendTestEmail',
        automationEmailPreviews.sendTestEmail,
        'sendTestAutomationEmail',
        {
          automationId: 'automation-id',
          email: 'jamie@example.com',
          subject: 'Welcome',
          lexical: lexical('Hello'),
        },
      ],
    ] as const) {
      it(`forwards ${endpoint} to the ready service`, async function () {
        await controller.query(frame);

        sinon.assert.calledOnceWithExactly(api[method], expected);
      });
    }
  });

  describe('welcome content and sender caches', function () {
    let api: Record<string, (...args: unknown[]) => Promise<unknown>>;
    let findAutomation: sinon.SinonStub;
    let getDefaultNewsletter: sinon.SinonStub;
    let sendBulk: sinon.SinonStub;

    beforeEach(async function () {
      await initRoot();
      api = root.service;
      findAutomation = sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      getDefaultNewsletter = sinon
        .stub(models.Newsletter, 'getDefaultNewsletter')
        .resolves(newsletter('First'));
      sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
      sendBulk = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: '<bulk-id>' });
      // Start each case from freshly loaded content and sender options.
      await api.loadMemberWelcomeEmails();
      findAutomation.resetHistory();
      getDefaultNewsletter.resetHistory();
    });

    it('sends the content captured by the last load and refreshes it on the next load', async function () {
      findAutomation.resolves(welcomeRow({ subject: 'Edited {site_title}' }));

      await api.send({ member, memberStatus: 'free' });
      assert.equal(sendTransactional.firstCall.args[0].subject, 'Welcome to Test Site');

      await api.loadMemberWelcomeEmails();
      await api.send({ member, memberStatus: 'free' });
      assert.equal(sendTransactional.secondCall.args[0].subject, 'Edited Test Site');
    });

    it('memoizes the default newsletter sender until welcome emails are reloaded', async function () {
      await api.sendAutomationEmail(automationEmail);
      getDefaultNewsletter.resolves(newsletter('Second'));
      await api.sendAutomationEmail(automationEmail);

      sinon.assert.notCalled(getDefaultNewsletter);
      for (const call of sendBulk.getCalls()) {
        assert.equal(call.args[0].from, '"First Sender" <first@example.com>');
        assert.equal(call.args[0].replyTo, 'first-reply@example.com');
      }

      await api.loadMemberWelcomeEmails();
      await api.sendAutomationEmail(automationEmail);

      sinon.assert.calledOnce(getDefaultNewsletter);
      assert.equal(sendBulk.thirdCall.args[0].from, '"Second Sender" <second@example.com>');
      assert.equal(sendBulk.thirdCall.args[0].replyTo, 'second-reply@example.com');
    });

    it('refreshes the sender cache for test sends without reloading welcome content', async function () {
      getDefaultNewsletter.resolves(newsletter('Second'));
      findAutomation.resolves(welcomeRow({ subject: 'Edited {site_title}' }));

      await api.sendTestEmail({
        email: 'owner@example.com',
        subject: 'Test {site_title}',
        lexical: lexical('Hello'),
        automatedEmailId: 'automation-id',
      });
      await api.send({ member, memberStatus: 'free' });

      sinon.assert.calledOnce(getDefaultNewsletter);
      const [testSend, welcomeSend] = sendTransactional.getCalls().map((call) => call.args[0]);
      assert.equal(testSend.to, 'owner@example.com');
      assert.equal(testSend.subject, '[Test] Test Test Site');
      assert.equal(testSend.from, '"Second Sender" <second@example.com>');
      assert.equal(welcomeSend.subject, 'Welcome to Test Site');
      assert.equal(welcomeSend.from, '"Second Sender" <second@example.com>');
    });

    it('reads site settings when each email is sent', async function () {
      await api.send({ member, memberStatus: 'free' });
      settings.title = 'Renamed Site';
      await api.send({ member, memberStatus: 'free' });

      assert.equal(sendTransactional.firstCall.args[0].subject, 'Welcome to Test Site');
      assert.equal(sendTransactional.secondCall.args[0].subject, 'Welcome to Renamed Site');
    });
  });

  describe('legacy welcome and general automation sends', function () {
    let api: Record<string, (...args: unknown[]) => Promise<unknown>>;
    let findDesign: sinon.SinonStub;

    beforeEach(async function () {
      await initRoot();
      api = root.service;
      sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      sinon.stub(models.Newsletter, 'getDefaultNewsletter').resolves(newsletter('First'));
      findDesign = sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
      await api.loadMemberWelcomeEmails();
      findDesign.resetHistory();
    });

    it('sends the legacy welcome email through the transactional mailer only', async function () {
      const sendBulk = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: '<bulk-id>' });

      const result = await api.send({ member, memberStatus: 'free' });

      assert.equal(result, undefined);
      sinon.assert.notCalled(sendBulk);
      sinon.assert.calledOnce(sendTransactional);
      const message = sendTransactional.firstCall.args[0];
      assert.equal(message.to, member.email);
      assert.equal(message.subject, 'Welcome to Test Site');
      assert.equal(message.forceTextContent, true);
      assert.deepEqual(message.tags, [constants.MEMBER_WELCOME_EMAIL_TAG]);
      assert.equal(message.from, '"First Sender" <first@example.com>');
      assert.equal(message.replyTo, 'first-reply@example.com');
      assert.equal(message.headers, undefined);
    });

    it('sends general automation emails through the bulk mailer with a design lookup per send', async function () {
      const response = { id: '<bulk-id>' };
      const sendBulk = sinon.stub(MailgunClient.prototype, 'send').resolves(response);

      const result = await api.sendAutomationEmail(automationEmail);
      await api.sendAutomationEmail(automationEmail);

      assert.equal(result, response);
      sinon.assert.notCalled(sendTransactional);
      sinon.assert.calledTwice(sendBulk);
      sinon.assert.calledTwice(findDesign);
      sinon.assert.alwaysCalledWithExactly(findDesign, { id: 'design-id' });
      const [message, recipients, replacements] = sendBulk.firstCall.args;
      assert.equal(message.subject, 'Automation');
      assert.equal(message.from, '"First Sender" <first@example.com>');
      assert.equal(message.replyTo, 'first-reply@example.com');
      assert.deepEqual(message.tags, [constants.AUTOMATION_EMAIL_TAG]);
      assert.equal(message.track_opens, true);
      assert.equal(typeof message.plaintext, 'string');
      assert.deepEqual(recipients, { [member.email]: {} });
      assert.deepEqual(replacements, []);
    });

    it('resolves null without a fallback send when bulk mail is not configured', async function () {
      const result = await api.sendAutomationEmail(automationEmail);

      assert.equal(result, null);
      sinon.assert.notCalled(sendTransactional);
      sinon.assert.calledWithExactly(logging.warn, 'Mailgun is not configured');
    });
  });

  describe('shared sender verification', function () {
    const adminUrl = urlUtils.urlFor('admin', true);
    const token = {
      token: 'verify-token',
      data: '',
      created_at: new Date(),
      first_used_at: null,
      used_count: 0,
      otc_used_count: 0,
    };
    const transaction = {};
    let api: Record<string, (...args: unknown[]) => Promise<unknown>>;
    let tokenModel: { get: (key: string) => unknown; save: sinon.SinonStub };
    let addToken: sinon.SinonStub;
    let editDesign: sinon.SinonStub;
    let validate: sinon.SinonStub;

    beforeEach(async function () {
      await initRoot();
      api = root.service;
      Object.assign(token, { created_at: new Date(), first_used_at: null, used_count: 0 });
      tokenModel = {
        get: (key) => token[key as keyof typeof token],
        save: sinon.stub().callsFake(async (attrs) => Object.assign(token, attrs)),
      };
      sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
      editDesign = sinon.stub(models.EmailDesignSetting, 'edit').resolves(designSettings);
      sinon
        .stub(models.Automation, 'findAll')
        .resolves({ models: ['automation'], meta: { pagination: {} } });
      sinon
        .stub(models.SingleUseToken, 'transaction')
        .callsFake(async (run) => (run as (transacting: object) => unknown)(transaction));
      sinon.stub(models.SingleUseToken, 'findOne').resolves(tokenModel);
      addToken = sinon.stub(models.SingleUseToken, 'add').resolves(tokenModel);
      validate = sinon
        .stub(emailAddressService.service, 'validate')
        .returns({ allowed: true, verificationEmailRequired: true });
    });

    it('sends a verification link through the transactional mailer instead of persisting the reply-to', async function () {
      const result = await api.editSharedSenderOptions({ sender_reply_to: 'reply@example.com' });

      sinon.assert.calledOnceWithExactly(validate, 'reply@example.com', 'replyTo');
      sinon.assert.notCalled(editDesign);
      sinon.assert.calledOnceWithExactly(addToken, {
        data: JSON.stringify({ property: 'sender_reply_to', value: 'reply@example.com' }),
      });
      sinon.assert.calledOnce(sendTransactional);
      const message = sendTransactional.firstCall.args[0];
      const link = `${adminUrl}#/settings/memberemails?verifyEmail=verify-token`;
      assert.equal(message.to, 'reply@example.com');
      assert.equal(message.subject, 'Verify email address');
      assert.equal(message.forceTextContent, true);
      assert.ok(message.text.includes(link));
      assert.ok(message.html.includes(link));
      // Outside production the magic-link text is logged for local verification.
      sinon.assert.calledWithExactly(logging.warn, message.text);
      assert.deepEqual(result, {
        data: ['automation'],
        meta: { pagination: {}, sent_email_verification: ['sender_reply_to'] },
      });
    });

    it('applies a reply-to token to the default design settings and reports the verified property', async function () {
      token.data = JSON.stringify({ property: 'sender_reply_to', value: ' reply@example.com ' });

      const result = await api.verifySenderPropertyUpdate('verify-token');

      sinon.assert.calledOnceWithExactly(
        models.SingleUseToken.findOne,
        { token: 'verify-token' },
        { transacting: transaction, forUpdate: true },
      );
      sinon.assert.calledOnceWithExactly(
        editDesign,
        { sender_reply_to: 'reply@example.com' },
        { id: 'design-id' },
      );
      assert.equal(token.used_count, 1);
      assert.deepEqual(result, {
        data: ['automation'],
        meta: { pagination: {}, email_verified: 'sender_reply_to' },
      });
    });

    it('rejects a token issued for any other sender property without editing design settings', async function () {
      token.data = JSON.stringify({ property: 'sender_email', value: 'sender@example.com' });

      await assert.rejects(api.verifySenderPropertyUpdate('verify-token'), {
        errorType: 'IncorrectUsageError',
        message: 'Not allowed to update this sender setting via token',
      });

      sinon.assert.notCalled(editDesign);
      // The token use is recorded before the property check, so the rejection consumes a use.
      assert.equal(token.used_count, 1);
    });

    it('rejects an unknown token before editing design settings', async function () {
      (models.SingleUseToken.findOne as sinon.SinonStub).resolves(null);

      await assert.rejects(api.verifySenderPropertyUpdate('missing'), { code: 'INVALID_TOKEN' });

      sinon.assert.notCalled(editDesign);
    });
  });
});
