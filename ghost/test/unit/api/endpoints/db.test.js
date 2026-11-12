const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const dbController = require('../../../../core/server/api/endpoints/db');
const mediaInliner = require('../../../../core/server/services/media-inliner').default;

describe('DB controller', function () {
  let settingsCache, importer;

  beforeEach(function () {
    settingsCache = require('../../../../core/shared/settings-cache');
    importer = {
      importFromFile: sinon.stub().resolves({
        db: [{ data: {} }],
        problems: [],
      }),
    };

    sinon.stub(settingsCache, 'get').withArgs('timezone').returns('UTC');
    sinon.stub(require('../../../../core/server/data/importer'), 'getInstance').returns(importer);
  });

  afterEach(function () {
    sinon.restore();
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
    it('starts inlining the requested domains', async function () {
      const startInlining = sinon.stub().resolves();
      sinon.stub(mediaInliner, 'service').get(() => ({ startInlining }));

      const result = await dbController.inlineMedia.query({
        data: { domains: ['https://example.com'] },
      });

      sinon.assert.calledOnceWithExactly(startInlining, ['https://example.com']);
      assert.deepEqual(result, { status: 'success' });
    });
  });
});
