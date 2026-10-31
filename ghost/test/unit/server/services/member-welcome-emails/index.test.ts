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
const StripeService = require('../../../../../core/server/services/stripe/stripe-service');
const automatedEmails = require('../../../../../core/server/api/endpoints/automated-emails');
const automationEmailPreviews = require('../../../../../core/server/api/endpoints/automation-email-previews');
const constants = require('../../../../../core/server/services/member-welcome-emails/constants');
const barrel = require('../../../../../core/server/services/member-welcome-emails');
const wrapper = require('../../../../../core/server/services/member-welcome-emails/service');

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

/**
 * Initializes a wrapper of the exported class without touching the shared event emitter,
 * which other files in this worker also listen on.
 */
function initWrapper(target = new wrapper.constructor()) {
  const on = sinon.stub(events, 'on');
  try {
    target.init();
    return { wrapper: target, on, localeListener: on.firstCall?.args[1] };
  } finally {
    on.restore();
  }
}

describe('Member welcome emails root', function () {
  const settings: Attributes = {};
  let sendTransactional: sinon.SinonStub;

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

  describe('shape', function () {
    it('exports the wrapper singleton as service and spreads the constants from the barrel', function () {
      assert.equal(barrel.service, wrapper);
      assert.deepEqual(Object.keys(barrel).sort(), ['service', ...Object.keys(constants)].sort());
      for (const [name, value] of Object.entries(constants)) {
        assert.equal(barrel[name], value);
      }
    });

    it('exposes a synchronous init with no api or i18n before the first call', function () {
      const fresh = new wrapper.constructor();

      assert.equal(typeof fresh.init, 'function');
      assert.equal(fresh.api, undefined);
      assert.equal(fresh.i18n, undefined);

      assert.equal(initWrapper(fresh).wrapper.init(), undefined);
      assert.ok(fresh.api);
    });
  });

  describe('initialization', function () {
    it('builds a ghost-namespace translator for the configured locale and follows locale edits', async function () {
      settings.locale = 'fr';

      const { wrapper: fresh, on, localeListener } = initWrapper();

      sinon.assert.calledOnceWithExactly(on, 'settings.locale.edited', sinon.match.func);
      assert.equal(fresh.i18n.language, 'fr');

      await localeListener({ get: (key: string) => (key === 'value' ? 'de' : undefined) });

      assert.equal(fresh.i18n.language, 'de');
    });

    it('renders welcome emails with the translator it built, so locale edits reach the footer', async function () {
      const { wrapper: fresh, localeListener } = initWrapper();
      sinon.stub(models.Newsletter, 'getDefaultNewsletter').resolves(newsletter('First'));
      sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      await fresh.api.loadMemberWelcomeEmails();
      const french = i18nLib('fr', 'ghost').t('Manage your preferences');
      assert.notEqual(french, 'Manage your preferences');

      await fresh.api.send({ member, memberStatus: 'free' });
      await localeListener({ get: () => 'fr' });
      await fresh.api.send({ member, memberStatus: 'free' });

      // The HTML entity-encodes accents, so the finalized plaintext carries the footer label.
      assert.ok(sendTransactional.firstCall.args[0].text.includes('Manage your preferences'));
      assert.ok(sendTransactional.secondCall.args[0].text.includes(french));
    });

    it('keeps one api across repeated init and one translator and listener across api resets', function () {
      const on = sinon.stub(events, 'on');
      const fresh = new wrapper.constructor();

      fresh.init();
      const api = fresh.api;
      const i18n = fresh.i18n;
      fresh.init();

      assert.equal(fresh.api, api);
      assert.equal(fresh.i18n, i18n);

      // Tests reset api to rebuild the implementation; the translator and its listener stay.
      fresh.api = null;
      fresh.init();

      assert.ok(fresh.api);
      assert.notEqual(fresh.api, api);
      assert.equal(fresh.i18n, i18n);
      sinon.assert.calledOnce(on);
    });
  });

  describe('caller-owned initialization', function () {
    let previousApi: unknown;
    let api: Record<string, sinon.SinonStub>;
    let init: sinon.SinonStub;

    beforeEach(function () {
      previousApi = wrapper.api;
      wrapper.api = undefined;
      api = {
        isMemberWelcomeEmailActive: sinon.stub().resolves(true),
        previewEmail: sinon.stub().resolves({ html: '<p>Preview</p>' }),
        sendTestEmail: sinon.stub().resolves(),
        editSharedSenderOptions: sinon.stub().resolves({ data: [], meta: {} }),
        verifySenderPropertyUpdate: sinon.stub().resolves({ data: [], meta: {} }),
        previewAutomationEmail: sinon.stub().resolves({ html: '<p>Preview</p>' }),
        sendTestAutomationEmail: sinon.stub().resolves(),
      };
      // Without the caller's init there is no api to read.
      init = sinon.stub(wrapper, 'init').callsFake(() => {
        wrapper.api = api;
      });
      sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
    });

    afterEach(function () {
      wrapper.api = previousApi;
    });

    it('initializes the wrapper before Stripe checks whether the paid welcome email is active', async function () {
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
      sinon.assert.calledOnce(init);
      sinon.assert.calledOnceWithExactly(api.isMemberWelcomeEmailActive, 'paid');
      sinon.assert.callOrder(init, api.isMemberWelcomeEmailActive);
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
      it(`initializes the wrapper before ${endpoint} reads the api`, async function () {
        await controller.query(frame);

        sinon.assert.calledOnce(init);
        sinon.assert.calledOnceWithExactly(api[method], expected);
        sinon.assert.callOrder(init, api[method]);
      });
    }
  });

  describe('welcome content and sender caches', function () {
    let api: Record<string, (...args: unknown[]) => Promise<unknown>>;
    let findAutomation: sinon.SinonStub;
    let getDefaultNewsletter: sinon.SinonStub;
    let sendBulk: sinon.SinonStub;

    beforeEach(function () {
      ({
        wrapper: { api },
      } = initWrapper());
      findAutomation = sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      getDefaultNewsletter = sinon
        .stub(models.Newsletter, 'getDefaultNewsletter')
        .resolves(newsletter('First'));
      sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
      sendBulk = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: '<bulk-id>' });
    });

    const sendAutomationEmail = () =>
      api.sendAutomationEmail({
        email: { designSettingId: 'design-id', lexical: lexical('Hello'), subject: 'Automation' },
        member,
        memberStatus: 'free',
        trackOpens: true,
        trackClicks: false,
        automationActionRevisionId: 'revision-id',
        automationRunStepId: 'step-id',
      });

    it('has no welcome content to send until loadMemberWelcomeEmails runs', async function () {
      await assert.rejects(api.send({ member, memberStatus: 'free' }), {
        message: MESSAGES.NO_MEMBER_WELCOME_EMAIL,
      });

      sinon.assert.notCalled(findAutomation);
      sinon.assert.notCalled(sendTransactional);
    });

    it('sends the content captured by the last load and refreshes it on the next load', async function () {
      await api.loadMemberWelcomeEmails();
      findAutomation.resolves(welcomeRow({ subject: 'Edited {site_title}' }));

      await api.send({ member, memberStatus: 'free' });
      assert.equal(sendTransactional.firstCall.args[0].subject, 'Welcome to Test Site');

      await api.loadMemberWelcomeEmails();
      await api.send({ member, memberStatus: 'free' });
      assert.equal(sendTransactional.secondCall.args[0].subject, 'Edited Test Site');
    });

    it('memoizes the default newsletter sender until welcome emails are reloaded', async function () {
      await sendAutomationEmail();
      getDefaultNewsletter.resolves(newsletter('Second'));
      await sendAutomationEmail();

      sinon.assert.calledOnce(getDefaultNewsletter);
      for (const call of sendBulk.getCalls()) {
        assert.equal(call.args[0].from, '"First Sender" <first@example.com>');
        assert.equal(call.args[0].replyTo, 'first-reply@example.com');
      }

      await api.loadMemberWelcomeEmails();
      await sendAutomationEmail();

      sinon.assert.calledTwice(getDefaultNewsletter);
      assert.equal(sendBulk.thirdCall.args[0].from, '"Second Sender" <second@example.com>');
      assert.equal(sendBulk.thirdCall.args[0].replyTo, 'second-reply@example.com');
    });

    it('refreshes the sender cache for test sends without reloading welcome content', async function () {
      await api.loadMemberWelcomeEmails();
      getDefaultNewsletter.resolves(newsletter('Second'));
      findAutomation.resolves(welcomeRow({ subject: 'Edited {site_title}' }));

      await api.sendTestEmail({
        email: 'owner@example.com',
        subject: 'Test {site_title}',
        lexical: lexical('Hello'),
        automatedEmailId: 'automation-id',
      });
      await api.send({ member, memberStatus: 'free' });

      sinon.assert.calledTwice(getDefaultNewsletter);
      const [testSend, welcomeSend] = sendTransactional.getCalls().map((call) => call.args[0]);
      assert.equal(testSend.to, 'owner@example.com');
      assert.equal(testSend.subject, '[Test] Test Test Site');
      assert.equal(testSend.from, '"Second Sender" <second@example.com>');
      assert.equal(welcomeSend.subject, 'Welcome to Test Site');
      assert.equal(welcomeSend.from, '"Second Sender" <second@example.com>');
    });

    it('reads site settings when each email is sent', async function () {
      await api.loadMemberWelcomeEmails();

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

    beforeEach(function () {
      ({
        wrapper: { api },
      } = initWrapper());
      sinon.stub(models.Automation, 'findOne').resolves(welcomeRow());
      sinon.stub(models.Newsletter, 'getDefaultNewsletter').resolves(newsletter('First'));
      findDesign = sinon.stub(models.EmailDesignSetting, 'findOne').resolves(designSettings);
    });

    const sendAutomationEmail = () =>
      api.sendAutomationEmail({
        email: { designSettingId: 'design-id', lexical: lexical('Hello'), subject: 'Automation' },
        member,
        memberStatus: 'free',
        trackOpens: true,
        trackClicks: false,
        automationActionRevisionId: 'revision-id',
        automationRunStepId: 'step-id',
      });

    it('sends the legacy welcome email through the transactional mailer only', async function () {
      const sendBulk = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: '<bulk-id>' });
      await api.loadMemberWelcomeEmails();

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

      const result = await sendAutomationEmail();
      await sendAutomationEmail();

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
      const result = await sendAutomationEmail();

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

    beforeEach(function () {
      ({
        wrapper: { api },
      } = initWrapper());
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
