import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import { createLoggingFake } from '../../../../utils/logging-utils';
// Required, not imported: the controller requires the same module, and an ESM
// import would give this test a second copy of the class to compare against.
const ProcessWebmentionJob =
  require('../../../../../core/server/services/mentions/process-webmention-job').default;
const MentionController = require('../../../../../core/server/services/mentions/mention-controller');

describe('MentionController', function () {
  let controller: any;
  let api: { processWebmention: sinon.SinonStub };
  let jobsService: { dispatch: sinon.SinonStub };
  let logging: ReturnType<typeof createLoggingFake>;

  beforeEach(async function () {
    api = { processWebmention: sinon.stub().resolves() };
    jobsService = { dispatch: sinon.stub().resolves() };
    logging = createLoggingFake();
    controller = new MentionController({
      logging,
      api,
      jobsService,
      mentionResourceService: { getByID: sinon.stub() },
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('processWebmention', function () {
    it('parses the urls and forwards them to the api', async function () {
      await controller.processWebmention({
        source: 'https://source.com/post/',
        target: 'https://target.com/post/',
      });

      sinon.assert.calledOnce(api.processWebmention);
      const webmention = api.processWebmention.firstCall.args[0];
      assert.deepEqual(webmention, {
        source: new URL('https://source.com/post/'),
        target: new URL('https://target.com/post/'),
      });
    });

    it('swallows and logs a failure from the api', async function () {
      const error = new Error('Could not process');
      api.processWebmention.rejects(error);

      await controller.processWebmention({
        source: 'https://source.com/post/',
        target: 'https://target.com/post/',
      });

      sinon.assert.calledWith(logging.error, error, '[Webmention] Failed processing webmention');
    });

    it('swallows and logs an unparseable url', async function () {
      await controller.processWebmention({
        source: 'not a url',
        target: 'https://target.com/post/',
      });

      sinon.assert.notCalled(api.processWebmention);
      sinon.assert.calledWith(
        logging.error,
        sinon.match.instanceOf(Error),
        '[Webmention] Failed processing webmention',
      );
    });
  });

  describe('receive', function () {
    it('dispatches a job carrying only the source and target', async function () {
      await controller.receive({
        data: {
          source: 'https://source.com/post/',
          target: 'https://target.com/post/',
          withExtension: true,
        },
      });

      sinon.assert.notCalled(api.processWebmention);
      sinon.assert.calledOnce(jobsService.dispatch);

      const job = jobsService.dispatch.firstCall.args[0];
      assert.ok(job instanceof ProcessWebmentionJob);
      assert.deepEqual(
        { ...job },
        { source: 'https://source.com/post/', target: 'https://target.com/post/' },
      );
    });
  });
});
