import assert from 'node:assert/strict';
import sinon from 'sinon';
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
import type { Invites } from '../../../../../core/server/services/invites/invites';

const rootPath = require.resolve('../../../../../core/server/services/invites');
const settingsCache = require('../../../../../core/shared/settings-cache');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const mailService = require('../../../../../core/server/lib/mail');
const urlUtils = require('../../../../../core/shared/url-utils').default;

describe('Invites service root', function () {
  const sandbox = sinon.createSandbox();
  let previousModule: NodeJS.Module | undefined;
  let invitesService: Invites;
  let InviteModel: { findOne: sinon.SinonStub; add: sinon.SinonStub; edit: sinon.SinonStub };
  let api: { mail: { send: sinon.SinonStub } };
  let input: Parameters<Invites['add']>[0];
  let created: Awaited<ReturnType<Invites['add']>>;
  let edited: Awaited<ReturnType<Invites['add']>> & { status: string };
  let render: sinon.SinonStub;
  let getTitle: sinon.SinonStub;
  let getDomain: sinon.SinonStub;
  let getAdminUrl: sinon.SinonStub;
  let warn: sinon.SinonStub;

  beforeEach(async function () {
    previousModule = require.cache[rootPath];
    delete require.cache[rootPath];
    const values: Record<string, string> = {
      token: 'invite+/token==',
      email: 'recipient@example.com',
    };
    created = { id: 'invite-id', get: (key) => values[key] };
    edited = { ...created, status: 'sent' };
    InviteModel = {
      findOne: sandbox.stub().resolves(null),
      add: sandbox.stub().resolves(created),
      edit: sandbox.stub().resolves(edited),
    };
    api = { mail: { send: sandbox.stub().resolves() } };
    render = sandbox
      .stub(mailService.utils, 'generateContent')
      .resolves({ html: '<p>Invitation</p>', text: 'Invitation' });
    getTitle = sandbox.stub(settingsCache, 'get').withArgs('title').returns('Example publication');
    getDomain = sandbox
      .stub(settingsHelpers, 'getDefaultEmailDomain')
      .returns('publication.example');
    getAdminUrl = sandbox
      .stub(urlUtils, 'urlFor')
      .withArgs('admin', true)
      .returns('https://example.com/blog/ghost/');
    warn = sandbox.stub(logging, 'warn');
    const invites = require(rootPath).default;
    await invites.init();
    invitesService = invites.service;
    input = {
      api,
      InviteModel,
      invites: [{ email: 'recipient@example.com', role_id: 'author-role' }],
      options: { context: { user: 'owner-id' } },
      user: { name: 'Owner', email: 'owner@example.com' },
    };
  });

  afterEach(function () {
    sandbox.restore();
    delete require.cache[rootPath];
    if (previousModule) {
      require.cache[rootPath] = previousModule;
    }
  });

  it('retains one initialized instance without rendering or sending an invitation', function () {
    assert.equal(require(rootPath).default.service, invitesService);
    sinon.assert.notCalled(render);
    sinon.assert.notCalled(api.mail.send);
  });

  it('sends the rendered invitation before marking it sent and returns the updated invite', async function () {
    const delivery = Promise.withResolvers<void>();
    const deliveryStarted = Promise.withResolvers<void>();
    api.mail.send.callsFake(() => {
      deliveryStarted.resolve();
      return delivery.promise;
    });
    const result = invitesService.add(input);

    try {
      await Promise.race([deliveryStarted.promise, result]);
      sinon.assert.notCalled(InviteModel.edit);
      sinon.assert.calledOnceWithExactly(
        InviteModel.findOne,
        { email: 'recipient@example.com' },
        input.options,
      );
      sinon.assert.calledOnceWithExactly(InviteModel.add, input.invites[0], input.options);
      sinon.assert.calledOnceWithExactly(render, {
        template: 'invite-user',
        data: {
          blogName: 'Example publication',
          invitedByName: 'Owner',
          invitedByEmail: 'owner@example.com',
          resetLink: 'https://example.com/blog/ghost/signup/invite-_token/',
          recipientEmail: 'recipient@example.com',
        },
      });
      sinon.assert.calledOnceWithExactly(
        api.mail.send,
        {
          mail: [
            {
              message: {
                to: 'recipient@example.com',
                replyTo: 'owner@example.com',
                subject: 'Owner has invited you to join Example publication',
                html: '<p>Invitation</p>',
                text: 'Invitation',
              },
              options: {},
            },
          ],
        },
        { context: { internal: true } },
      );
    } finally {
      delivery.resolve();
      await Promise.allSettled([result]);
    }
    assert.equal(await result, edited);
    sinon.assert.calledOnceWithExactly(
      InviteModel.edit,
      { status: 'sent' },
      { id: 'invite-id', ...input.options },
    );
  });

  it('waits for the previous invitation to be removed before creating and sending its replacement', async function () {
    const removal = Promise.withResolvers<void>();
    const removalStarted = Promise.withResolvers<void>();
    const existing = {
      destroy: sandbox.stub().callsFake(() => {
        removalStarted.resolve();
        return removal.promise;
      }),
    };
    InviteModel.findOne.resolves(existing);
    const result = invitesService.add(input);

    try {
      await Promise.race([removalStarted.promise, result]);
      sinon.assert.calledOnceWithExactly(existing.destroy, input.options);
      sinon.assert.notCalled(InviteModel.add);
      sinon.assert.notCalled(api.mail.send);
    } finally {
      removal.resolve();
      await Promise.allSettled([result]);
    }
    assert.equal(await result, edited);
    sinon.assert.calledOnce(InviteModel.add);
    sinon.assert.calledOnce(api.mail.send);
  });

  it('uses the API-key template and site sender when no inviting user is supplied', async function () {
    input.user = {};
    await invitesService.add(input);

    sinon.assert.calledOnceWithExactly(render, {
      template: 'invite-user-by-api-key',
      data: {
        blogName: 'Example publication',
        invitedByEmail: 'ghost@publication.example',
        resetLink: 'https://example.com/blog/ghost/signup/invite-_token/',
        recipientEmail: 'recipient@example.com',
      },
    });
    const message = api.mail.send.firstCall.args[0].mail[0].message;
    assert.equal(message.replyTo, 'ghost@publication.example');
    assert.equal(message.subject, 'You have been invited to join Example publication');
    assert.equal(message.to, 'recipient@example.com');
  });

  it('reads current publication settings through the same retained instance', async function () {
    input.user = {};
    await invitesService.add(input);
    getTitle.returns('Renamed publication');
    getDomain.returns('renamed.example');
    getAdminUrl.returns('https://renamed.example/ghost/');
    await invitesService.add(input);

    assert.deepEqual(render.lastCall.args[0], {
      template: 'invite-user-by-api-key',
      data: {
        blogName: 'Renamed publication',
        invitedByEmail: 'ghost@renamed.example',
        resetLink: 'https://renamed.example/ghost/signup/invite-_token/',
        recipientEmail: 'recipient@example.com',
      },
    });
    assert.equal(api.mail.send.lastCall.args[0].mail[0].message.replyTo, 'ghost@renamed.example');
    assert.equal(
      api.mail.send.lastCall.args[0].mail[0].message.subject,
      'You have been invited to join Renamed publication',
    );
    assert.equal(require(rootPath).default.service, invitesService);
  });

  it('adds actionable mail context to the original delivery error without marking the invitation sent', async function () {
    const failure = new errors.EmailError({ message: 'Delivery refused' });
    api.mail.send.rejects(failure);

    await assert.rejects(invitesService.add(input), (error) => error === failure);

    assert.match(failure.message, /Error sending email: Delivery refused/);
    assert.match(failure.message, /check your email settings and resend the invitation/);
    sinon.assert.calledOnceWithExactly(warn, failure.message);
    sinon.assert.notCalled(InviteModel.edit);
  });

  for (const stage of ['lookup', 'remove', 'create', 'render', 'send', 'mark sent']) {
    it(`propagates a ${stage} failure and stops subsequent steps`, async function () {
      const existing = { destroy: sandbox.stub().resolves() };
      InviteModel.findOne.resolves(existing);
      const steps = [
        InviteModel.findOne,
        existing.destroy,
        InviteModel.add,
        render,
        api.mail.send,
        InviteModel.edit,
      ];
      const index = ['lookup', 'remove', 'create', 'render', 'send', 'mark sent'].indexOf(stage);
      const failure = new Error(`${stage} failed`);
      steps[index].rejects(failure);

      await assert.rejects(invitesService.add(input), (error) => error === failure);

      steps.slice(index + 1).forEach((step) => sinon.assert.notCalled(step));
      sinon.assert.notCalled(warn);
    });
  }
});
