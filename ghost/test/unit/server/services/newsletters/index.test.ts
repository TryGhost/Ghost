import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/lib/mail');
const sentry = require('../../../../../core/shared/sentry');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const emailAddress = require('../../../../../core/server/services/email-address');
const newslettersService = require('../../../../../core/server/services/newsletters');

describe('Newsletters Service', function () {
  describe('Newsletter Service', function () {
    it('Provides expected public API', async function () {
      assert.ok(newslettersService.browse);
      assert.ok(newslettersService.edit);
      assert.ok(newslettersService.add);
      assert.ok(newslettersService.verifyPropertyUpdate);
    });
  });

  describe('Email verification', function () {
    const sandbox = sinon.createSandbox();
    const now = Date.parse('2030-01-01T12:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    const tenMinutes = 10 * 60 * 1000;
    const tokenData = { id: 'newsletter-id', property: 'sender_email', value: 'owner@example.com' };
    const transaction = {};
    let token: Record<string, unknown>;
    let tokenModel: { get: (key: string) => unknown; save: sinon.SinonStub };
    let findToken: sinon.SinonStub;
    let addToken: sinon.SinonStub;
    let editNewsletter: sinon.SinonStub;
    let send: sinon.SinonStub;

    beforeEach(function () {
      sandbox.useFakeTimers({ now, toFake: ['Date'] });
      sandbox.stub(sentry, 'captureMessage');
      sandbox.stub(logging, 'warn');
      sandbox.stub(emailAddress, 'service').value({
        defaultFromEmail: { address: 'sender@publication.example', name: 'Publication' },
      });
      sandbox
        .stub(urlUtils, 'urlFor')
        .withArgs('admin', true)
        .returns('https://publication.example/blog/ghost/');
      send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
      sandbox
        .stub(models.SingleUseToken, 'transaction')
        .callsFake(async (run) => (run as (transacting: object) => unknown)(transaction));
      token = {
        token: 'newsletter-verification-token',
        data: JSON.stringify(tokenData),
        created_at: new Date(now),
        first_used_at: null,
        used_count: 0,
        otc_used_count: 0,
      };
      tokenModel = {
        get: (key) => token[key],
        save: sandbox.stub().callsFake(async (attrs) => Object.assign(token, attrs)),
      };
      findToken = sandbox.stub(models.SingleUseToken, 'findOne').resolves(tokenModel);
      addToken = sandbox.stub(models.SingleUseToken, 'add').resolves(tokenModel);
      editNewsletter = sandbox.stub(models.Newsletter, 'edit').resolves({ id: 'newsletter-id' });
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('issues a verification link and applies its token through the configured provider', async function () {
      await newslettersService.sendEmailVerificationMagicLink({
        id: 'newsletter-id',
        email: 'owner@example.com',
        property: 'sender_email',
      });

      sinon.assert.calledOnceWithExactly(addToken, { data: JSON.stringify(tokenData) });
      sinon.assert.calledOnce(send);
      const message = send.firstCall.args[0];
      const link =
        'https://publication.example/blog/ghost/#/settings/newsletters/?verifyEmail=newsletter-verification-token';
      assert.equal(message.to, 'owner@example.com');
      assert.equal(message.subject, 'Verify email address');
      assert.equal(message.forceTextContent, true);
      assert.ok(message.text.includes(link));
      assert.ok(message.html.includes(link));

      const result = await newslettersService.verifyPropertyUpdate(
        new URL(link).hash.split('verifyEmail=')[1],
      );

      assert.equal(result.meta.email_verified, 'sender_email');
      sinon.assert.calledOnceWithExactly(
        editNewsletter,
        { sender_email: 'owner@example.com' },
        { id: 'newsletter-id' },
      );
      assert.equal(token.used_count, 1);
    });

    it('propagates a property update failure after token usage has been recorded', async function () {
      const failure = new Error('Newsletter update unavailable');
      editNewsletter.rejects(failure);

      await assert.rejects(
        newslettersService.verifyPropertyUpdate(token.token),
        (error) => error === failure,
      );

      assert.equal(token.used_count, 1);
      sinon.assert.calledOnce(editNewsletter);
    });

    it('accepts seven uses of a fresh token and rejects the eighth without another newsletter edit', async function () {
      for (let i = 0; i < 7; i++) {
        const result = await newslettersService.verifyPropertyUpdate(token.token);
        assert.equal(result.meta.email_verified, 'sender_email');
      }

      await assert.rejects(newslettersService.verifyPropertyUpdate(token.token), {
        code: 'TOKEN_EXPIRED',
      });

      assert.equal(editNewsletter.callCount, 7);
      assert.equal(token.used_count, 7);
      sinon.assert.alwaysCalledWithExactly(
        findToken,
        { token: token.token },
        { transacting: transaction, forUpdate: true },
      );
    });

    for (const [limit, accepted, rejected] of [
      [
        '24 hours after creation',
        { created_at: new Date(now - day) },
        { created_at: new Date(now - day - 1) },
      ],
      [
        'ten minutes after first use',
        { used_count: 1, first_used_at: new Date(now - tenMinutes) },
        { used_count: 1, first_used_at: new Date(now - tenMinutes - 1) },
      ],
    ] as const) {
      it(`accepts a token ${limit}`, async function () {
        Object.assign(token, accepted);

        const result = await newslettersService.verifyPropertyUpdate(token.token);

        assert.equal(result.meta.email_verified, 'sender_email');
        sinon.assert.calledOnce(editNewsletter);
      });

      it(`rejects a token beyond ${limit} before changing newsletter settings`, async function () {
        Object.assign(token, rejected);

        await assert.rejects(newslettersService.verifyPropertyUpdate(token.token), {
          code: 'TOKEN_EXPIRED',
        });

        sinon.assert.notCalled(editNewsletter);
        sinon.assert.notCalled(tokenModel.save);
      });
    }

    it('rejects an unknown token before changing newsletter settings', async function () {
      findToken.resolves(null);

      await assert.rejects(newslettersService.verifyPropertyUpdate('missing'), {
        code: 'INVALID_TOKEN',
      });

      sinon.assert.notCalled(editNewsletter);
    });

    it('does not send mail when the verification token cannot be stored', async function () {
      const failure = new Error('Token persistence unavailable');
      addToken.rejects(failure);

      await assert.rejects(
        newslettersService.sendEmailVerificationMagicLink({
          id: 'newsletter-id',
          email: 'owner@example.com',
          property: 'sender_email',
        }),
        (error) => error === failure,
      );

      sinon.assert.notCalled(send);
    });

    it('propagates mail delivery failure for a verification link', async function () {
      const failure = new Error('Mail unavailable');
      send.rejects(failure);

      await assert.rejects(
        newslettersService.sendEmailVerificationMagicLink({
          id: 'newsletter-id',
          email: 'owner@example.com',
          property: 'sender_email',
        }),
        (error) => error === failure,
      );

      sinon.assert.calledOnce(send);
    });
  });
});
