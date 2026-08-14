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
});
