const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const dbControllerPath = require.resolve('../../../../core/server/api/endpoints/db');
const jobsServicePath = require.resolve('../../../../core/server/services/jobs-service');
const dbController = require(dbControllerPath);
const jobsService = require(jobsServicePath);
const ExternalMediaInlinerJob =
  require('../../../../core/server/services/media-inliner/external-media-inliner-job').default;

describe('DB controller', function () {
  let settingsCache, importer, jobsServiceInitialised;

  beforeEach(function () {
    jobsServiceInitialised = false;
    settingsCache = require('../../../../core/shared/settings-cache');
    importer = require('../../../../core/server/data/importer');

    sinon.stub(settingsCache, 'get').withArgs('timezone').returns('UTC');
    sinon.stub(importer, 'importFromFile').resolves({
      db: [{ data: {} }],
      problems: [],
    });
  });

  afterEach(async function () {
    if (jobsServiceInitialised) {
      await jobsService.shutdown({ timeoutMs: 100 });
      jobsServiceInitialised = false;
    }
    sinon.restore();
  });

  afterAll(function () {
    delete require.cache[dbControllerPath];
    delete require.cache[jobsServicePath];
  });

  describe('importContent', function () {
    it('uses frame.user.email when frame.user is present', async function () {
      const mockUser = {
        get: sinon.stub().returns('user@example.com'),
      };
      const frame = {
        user: mockUser,
        file: { path: 'test.json' },
      };

      await dbController.importContent.query(frame);

      // Verify the user's email was used
      sinon.assert.calledWith(mockUser.get, 'email');
      sinon.assert.calledWith(
        importer.importFromFile,
        frame.file,
        sinon.match({
          user: { email: 'user@example.com' },
        }),
      );
    });

    it('uses owner email fallback when frame.user is missing', async function () {
      const mockOwnerUser = {
        get: sinon.stub().returns('owner@example.com'),
      };
      sinon.stub(models.User, 'getOwnerUser').resolves(mockOwnerUser);

      const frame = {
        user: null, // No user in frame (integration auth scenario)
        file: { path: 'test.json' },
      };

      await dbController.importContent.query(frame);

      // Verify the owner fallback path was used
      sinon.assert.calledOnce(models.User.getOwnerUser);
      sinon.assert.calledWith(mockOwnerUser.get, 'email');
      sinon.assert.calledWith(
        importer.importFromFile,
        frame.file,
        sinon.match({
          user: { email: 'owner@example.com' },
        }),
      );
    });
  });

  describe('inlineMedia', function () {
    let dispatch;

    beforeEach(function () {
      const service = jobsService.init();
      jobsServiceInitialised = true;
      dispatch = sinon.stub(service, 'dispatch').resolves();
    });

    it('dispatches explicit domains', async function () {
      const result = await dbController.inlineMedia.query({
        data: { domains: ['https://example.com'] },
      });

      sinon.assert.calledOnce(dispatch);
      const job = dispatch.firstCall.firstArg;
      assert.ok(job instanceof ExternalMediaInlinerJob);
      assert.deepEqual(job.domains, ['https://example.com']);
      assert.deepEqual(result, { status: 'success' });
    });

    it('dispatches the default domains when domains are missing', async function () {
      await dbController.inlineMedia.query({ data: {} });

      assert.deepEqual(dispatch.firstCall.firstArg.domains, [
        'https://s3.amazonaws.com/revue',
        'https://substackcdn.com',
      ]);
    });

    it('dispatches the default domains when domains are empty', async function () {
      await dbController.inlineMedia.query({ data: { domains: [] } });

      assert.deepEqual(dispatch.firstCall.firstArg.domains, [
        'https://s3.amazonaws.com/revue',
        'https://substackcdn.com',
      ]);
    });
  });
});
