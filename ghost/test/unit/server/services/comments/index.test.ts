import assert from 'node:assert/strict';
import path from 'node:path';
import sinon from 'sinon';
import type commentsRoot from '../../../../../core/server/services/comments';

const fs = require('node:fs/promises') as typeof import('node:fs/promises');
const { IncorrectUsageError } = require('@tryghost/errors');
const emailService = require('../../../../../core/server/services/email-service');
const ROOT_PATH = require.resolve('../../../../../core/server/services/comments');

describe('Comments service root', function () {
  const sandbox = sinon.createSandbox();
  let previousModule: NodeJS.Module | undefined;
  let previousRenderer: PropertyDescriptor | undefined;
  let root: typeof commentsRoot;

  beforeEach(function () {
    previousModule = require.cache[ROOT_PATH];
    previousRenderer = Object.getOwnPropertyDescriptor(emailService, 'renderer');
    delete require.cache[ROOT_PATH];
    root = require(ROOT_PATH).default;
  });

  afterEach(function () {
    sandbox.restore();
    if (previousRenderer) {
      Object.defineProperty(emailService, 'renderer', previousRenderer);
    } else {
      delete emailService.renderer;
    }
    delete require.cache[ROOT_PATH];
    if (previousModule) {
      require.cache[ROOT_PATH] = previousModule;
    }
  });

  for (const name of ['new-comment', 'new-comment-reply', 'report']) {
    it(`wires the UTF-8 source of the ${name} template into the renderer`, async function () {
      await root.init();
      const renderer = root.service.api.emails.commentsServiceEmailRenderer;
      const expected = await fs.readFile(
        path.join(path.dirname(ROOT_PATH), 'email-templates', `${name}.hbs`),
        'utf8',
      );

      const source = await renderer.readTemplate(name);

      assert.equal(typeof source, 'string');
      assert.equal(source, expected);
    });
  }

  for (const name of ['unknown', '../index', 'toString', '__proto__']) {
    it(`rejects the template name ${name} before reading any file`, async function () {
      await root.init();
      const readFile = sandbox.spy(fs, 'readFile');
      const renderer = root.service.api.emails.commentsServiceEmailRenderer;

      await assert.rejects(renderer.renderEmailTemplate(name, {}), IncorrectUsageError);

      sinon.assert.notCalled(readFile);
    });
  }

  it('resolves the current Email renderer only when creating an unsubscribe link', async function () {
    const getRenderer = sandbox.stub().throws(new Error('Email has not initialized'));
    Object.defineProperty(emailService, 'renderer', {
      configurable: true,
      get: getRenderer,
    });

    await root.init();

    sinon.assert.notCalled(getRenderer);
    const emails = root.service.api.emails;
    const firstRenderer = {
      createUnsubscribeUrl: sandbox.stub().returns('https://example.com/first-unsubscribe/'),
    };
    getRenderer.returns(firstRenderer);

    assert.equal(
      emails.createUnsubscribeUrl('member-uuid', { comments: true }),
      'https://example.com/first-unsubscribe/',
    );
    sinon.assert.calledOnceWithExactly(firstRenderer.createUnsubscribeUrl, 'member-uuid', {
      comments: true,
    });
    sinon.assert.calledOn(firstRenderer.createUnsubscribeUrl, firstRenderer);

    const nextRenderer = {
      createUnsubscribeUrl: sandbox.stub().returns('https://example.com/next-unsubscribe/'),
    };
    getRenderer.returns(nextRenderer);

    assert.equal(
      emails.createUnsubscribeUrl('another-member-uuid', { comments: true }),
      'https://example.com/next-unsubscribe/',
    );
    sinon.assert.calledOnceWithExactly(nextRenderer.createUnsubscribeUrl, 'another-member-uuid', {
      comments: true,
    });
    sinon.assert.calledOn(nextRenderer.createUnsubscribeUrl, nextRenderer);
    sinon.assert.calledOnce(firstRenderer.createUnsubscribeUrl);
    sinon.assert.calledTwice(getRenderer);
  });
});
