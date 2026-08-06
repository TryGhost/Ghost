const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../../../../core/server/services/url');
const urlUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/utils/url');

describe('Unit: endpoints/utils/serializers/input/utils/url', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('forceUrlColumnsWhenLazy', function () {
        it('forces the lazy-required columns into the fetch when url is requested', function () {
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('tags').returns(['visibility']);
            const frame = {options: {columns: ['url', 'id']}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'tags');

            assert.deepEqual(frame.options.columns, ['url', 'id', 'visibility']);
        });

        it('does not duplicate a column already requested', function () {
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('tags').returns(['visibility']);
            const frame = {options: {columns: ['url', 'visibility']}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'tags');

            assert.deepEqual(frame.options.columns, ['url', 'visibility']);
        });

        it('is a no-op when url is not requested', function () {
            const stub = sinon.stub(urlService.facade, 'getRequiredFields');
            const frame = {options: {columns: ['id', 'slug']}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'tags');

            assert.deepEqual(frame.options.columns, ['id', 'slug']);
            sinon.assert.notCalled(stub);
        });

        it('is a no-op when no columns are set (full fetch carries every field)', function () {
            const frame = {options: {}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'tags');

            assert.deepEqual(frame.options, {});
        });

        it('records the forced columns so the output can strip them', function () {
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns(['status', 'type', 'slug']);
            const frame = {options: {columns: ['url', 'slug']}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.columns, ['url', 'slug', 'status', 'type']);
            // only what the caller did not request
            assert.deepEqual(frame.forcedUrlColumns, ['status', 'type']);
        });

        it('records no forced columns when everything was already requested', function () {
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns(['status']);
            const frame = {options: {columns: ['url', 'status']}};

            urlUtil.forceUrlColumnsWhenLazy(frame, 'posts');

            assert.equal(frame.forcedUrlColumns, undefined);
        });
    });

    describe('forceUrlRelationsWhenLazy', function () {
        it('forces the primary key into a narrowed fetch', function () {
            // Both backends look the URL up by `model.id`, so this is not
            // specific to the lazy service — hence no required relations here.
            sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns(['status']);
            const frame = {options: {columns: ['url', 'title']}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.columns, ['url', 'title', 'status', 'id']);
            assert.deepEqual(frame.forcedUrlColumns, ['status', 'id']);
        });

        it('forces the primary key so the required relations can load', function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags']);
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns([]);
            const frame = {options: {columns: ['url', 'title']}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.withRelated, ['tags']);
            assert.deepEqual(frame.forcedUrlColumns, ['id']);
        });

        it('leaves a read looked up by id alone', function () {
            // The model already carries the primary key it was fetched by, and
            // forcing it would strip an id the caller is served today.
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags']);
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns([]);
            const frame = {data: {id: 'abc123'}, options: {columns: ['url', 'title']}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.columns, ['url', 'title']);
            assert.equal(frame.forcedUrlColumns, undefined);
        });

        it('does not duplicate the primary key when the caller requested it', function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('posts').returns([]);
            const frame = {options: {columns: ['url', 'id']}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.columns, ['url', 'id']);
            assert.equal(frame.forcedUrlColumns, undefined);
        });

        it('is a no-op when the fetch is not narrowed', function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);
            const frame = {options: {}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.equal(frame.options.columns, undefined);
            assert.equal(frame.forcedUrlColumns, undefined);
        });

        it('is a no-op when the url will not be serialized', function () {
            const relations = sinon.stub(urlService.facade, 'getRequiredRelations');
            const frame = {options: {columns: ['title', 'slug']}};

            urlUtil.forceUrlRelationsWhenLazy(frame, 'posts');

            assert.deepEqual(frame.options.columns, ['title', 'slug']);
            assert.equal(frame.options.withRelated, undefined);
            sinon.assert.notCalled(relations);
        });
    });
});
