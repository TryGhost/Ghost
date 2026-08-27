const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../../../../core/server/services/url');
const urlUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/utils/url');

describe('Unit: endpoints/utils/serializers/input/utils/url', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('forceUrlColumns', function () {
    it('forces the required columns into the fetch when url is requested', function () {
      sinon.stub(urlService, 'getRequiredFields').withArgs('tags').returns(['visibility']);
      const frame = { options: { columns: ['url', 'id'] } };

      urlUtil.forceUrlColumns(frame, 'tags');

      assert.deepEqual(frame.options.columns, ['url', 'id', 'visibility']);
    });

    it('does not duplicate a column already requested', function () {
      sinon.stub(urlService, 'getRequiredFields').withArgs('tags').returns(['visibility']);
      const frame = { options: { columns: ['url', 'visibility'] } };

      urlUtil.forceUrlColumns(frame, 'tags');

      assert.deepEqual(frame.options.columns, ['url', 'visibility']);
    });

    it('is a no-op when url is not requested', function () {
      const stub = sinon.stub(urlService, 'getRequiredFields');
      const frame = { options: { columns: ['id', 'slug'] } };

      urlUtil.forceUrlColumns(frame, 'tags');

      assert.deepEqual(frame.options.columns, ['id', 'slug']);
      sinon.assert.notCalled(stub);
    });

    it('is a no-op when no columns are set (full fetch carries every field)', function () {
      const frame = { options: {} };

      urlUtil.forceUrlColumns(frame, 'tags');

      assert.deepEqual(frame.options, {});
    });

    it('records the forced columns so the output can strip them', function () {
      sinon
        .stub(urlService, 'getRequiredFields')
        .withArgs('posts')
        .returns(['status', 'type', 'slug']);
      const frame = { options: { columns: ['url', 'slug'] } };

      urlUtil.forceUrlColumns(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['url', 'slug', 'status', 'type']);
      // only what the caller did not request, tagged with the fetch it
      // belongs to so nested mappers don't strip each other's columns
      assert.deepEqual(frame.forcedUrlColumns, {
        routerType: 'posts',
        columns: ['status', 'type'],
      });
    });

    it('records no forced columns when everything was already requested', function () {
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns(['status']);
      const frame = { options: { columns: ['url', 'status'] } };

      urlUtil.forceUrlColumns(frame, 'posts');

      assert.equal(frame.forcedUrlColumns, undefined);
    });

    it('loads the fields the read was looked up by but never strips them', function () {
      // `findOne` forges the model with them before the fetch, so they
      // are on the response already and stripping them would take away a
      // field the caller is served today. They are still selected: the
      // lookup matches case-insensitively, so the forged value can differ
      // from the stored one, and the URL is built from whichever the
      // model ends up carrying.
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns(['slug', 'status']);
      const frame = { data: { slug: 'Welcome' }, options: { columns: ['url', 'title'] } };

      urlUtil.forceUrlColumns(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['url', 'title', 'slug', 'status']);
      assert.deepEqual(frame.forcedUrlColumns, { routerType: 'posts', columns: ['status'] });
    });
  });

  describe('forceUrlRelations', function () {
    it('forces the primary key into a narrowed fetch', function () {
      // The URL is looked up by `model.id`, so the primary key is
      // forced even when no relations are required.
      sinon.stub(urlService, 'getRequiredRelations').returns([]);
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns(['status']);
      const frame = { options: { columns: ['url', 'title'] } };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['url', 'title', 'status', 'id']);
      assert.deepEqual(frame.forcedUrlColumns, { routerType: 'posts', columns: ['status', 'id'] });
    });

    it('forces the primary key so the required relations can load', function () {
      sinon.stub(urlService, 'getRequiredRelations').returns(['tags']);
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns([]);
      const frame = { options: { columns: ['url', 'title'] } };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.deepEqual(frame.options.withRelated, ['tags']);
      assert.deepEqual(frame.forcedUrlColumns, { routerType: 'posts', columns: ['id'] });
    });

    it('never strips the primary key from a read looked up by id', function () {
      // The model already carries the key it was fetched by, so stripping
      // it would take away an id the caller is served today.
      sinon.stub(urlService, 'getRequiredRelations').returns(['tags']);
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns([]);
      const frame = { data: { id: 'abc123' }, options: { columns: ['url', 'title'] } };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['url', 'title', 'id']);
      assert.equal(frame.forcedUrlColumns, undefined);
    });

    it('does not duplicate the primary key when the caller requested it', function () {
      sinon.stub(urlService, 'getRequiredRelations').returns([]);
      sinon.stub(urlService, 'getRequiredFields').withArgs('posts').returns([]);
      const frame = { options: { columns: ['url', 'id'] } };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['url', 'id']);
      assert.equal(frame.forcedUrlColumns, undefined);
    });

    it('is a no-op when the fetch is not narrowed', function () {
      sinon.stub(urlService, 'getRequiredRelations').returns([]);
      const frame = { options: {} };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.equal(frame.options.columns, undefined);
      assert.equal(frame.forcedUrlColumns, undefined);
    });

    it('is a no-op when the url will not be serialized', function () {
      const relations = sinon.stub(urlService, 'getRequiredRelations');
      const frame = { options: { columns: ['title', 'slug'] } };

      urlUtil.forceUrlRelations(frame, 'posts');

      assert.deepEqual(frame.options.columns, ['title', 'slug']);
      assert.equal(frame.options.withRelated, undefined);
      sinon.assert.notCalled(relations);
    });
  });
});
