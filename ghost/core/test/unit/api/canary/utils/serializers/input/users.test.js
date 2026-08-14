const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../../../core/server/services/url');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/input/users', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('browse', function () {
        it('forces the lazy-required author columns into the fetch when url is requested', function () {
            // Staff users route through the authors router types; without
            // this, `?fields=url` strips the permalink columns (slug) and the
            // lazy URL service generates /author/undefined/.
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('authors').returns(['slug']);
            const frame = {options: {columns: ['url', 'id']}};

            serializers.input.users.browse({}, frame);

            assert.deepEqual(frame.options.columns, ['url', 'id', 'slug']);
        });
    });

    describe('read', function () {
        it('forces the lazy-required author columns into the fetch when url is requested', function () {
            sinon.stub(urlService.facade, 'getRequiredFields').withArgs('authors').returns(['slug']);
            const frame = {data: {}, options: {columns: ['url', 'id']}};

            serializers.input.users.read({}, frame);

            assert.deepEqual(frame.options.columns, ['url', 'id', 'slug']);
        });
    });
});
