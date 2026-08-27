import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

const MentionController = require('../../../../../core/server/services/mentions/mention-controller');

describe('MentionController', function () {
  let controller: any;
  let api: { processWebmention: sinon.SinonStub };
  let jobService: { addJob: sinon.SinonStub };
  let loggingStub: sinon.SinonStubbedInstance<typeof logging>;

  beforeEach(async function () {
    api = { processWebmention: sinon.stub().resolves() };
    jobService = { addJob: sinon.stub() };
    loggingStub = sinon.stub(logging);
    controller = new MentionController();
    await controller.init({ api, jobService, mentionResourceService: { getByID: sinon.stub() } });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('processWebmention', function () {
    it('parses the urls and forwards the payload to the api', async function () {
      await controller.processWebmention({
        source: 'https://source.com/post/',
        target: 'https://target.com/post/',
        payload: { withExtension: true },
      });

      sinon.assert.calledOnce(api.processWebmention);
      const webmention = api.processWebmention.firstCall.args[0];
      assert.deepEqual(webmention.source, new URL('https://source.com/post/'));
      assert.deepEqual(webmention.target, new URL('https://target.com/post/'));
      assert.deepEqual(webmention.payload, { withExtension: true });
    });

    it('swallows and logs a failure from the api', async function () {
      const error = new Error('Could not process');
      api.processWebmention.rejects(error);

      await controller.processWebmention({
        source: 'https://source.com/post/',
        target: 'https://target.com/post/',
        payload: {},
      });

      sinon.assert.calledWith(
        loggingStub.error,
        error,
        '[Webmention] Failed processing webmention',
      );
    });

    it('swallows and logs an unparseable url', async function () {
      await controller.processWebmention({
        source: 'not a url',
        target: 'https://target.com/post/',
        payload: {},
      });

      sinon.assert.notCalled(api.processWebmention);
      sinon.assert.calledWith(
        loggingStub.error,
        sinon.match.instanceOf(Error),
        '[Webmention] Failed processing webmention',
      );
    });
  });

  describe('receive', function () {
    it('queues a job that processes the webmention off the request', async function () {
      await controller.receive({
        data: {
          source: 'https://source.com/post/',
          target: 'https://target.com/post/',
          withExtension: true,
        },
      });

      sinon.assert.notCalled(api.processWebmention);
      sinon.assert.calledOnce(jobService.addJob);

      await jobService.addJob.firstCall.args[1]();

      const webmention = api.processWebmention.firstCall.args[0];
      assert.deepEqual(webmention.source, new URL('https://source.com/post/'));
      assert.deepEqual(webmention.target, new URL('https://target.com/post/'));
      assert.deepEqual(webmention.payload, { withExtension: true });
    });
  });
});
