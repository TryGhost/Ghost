const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const urlService = require('../../../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../../../core/shared/url-utils');
const urlUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');

describe('Unit: endpoints/utils/serializers/output/utils/url', function () {
    let getUrlForResourceStub;

    beforeEach(function () {
        getUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource').returns('getUrlForResource');
        sinon.stub(urlUtils, 'urlFor').returns('urlFor');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('forPost', function () {
        let pageModel;

        beforeEach(function () {
            pageModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('passes a posts resource (with id and slug) to the facade', function () {
            const post = pageModel(testUtils.DataGenerator.forKnex.createPost({
                id: 'id1',
                mobiledoc: '{}',
                html: 'html'
            }));

            urlUtil.forPost(post.id, post, {options: {}});

            assert(Object.hasOwn(post, 'url'));
            sinon.assert.callCount(getUrlForResourceStub, 1);
            const [resource, options] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.type, 'posts');
            assert.equal(resource.id, 'id1');
            assert.equal(resource.slug, post.slug);
            assert.deepEqual(options, {absolute: true});
        });

        it('still passes id when attrs has been stripped (e.g. fields=url)', function () {
            // Content API request like `?fields=url` runs jsonModel through a
            // serializer that strips every attribute except `url`. The mapper
            // calls forPost(model.id, jsonModel, frame) — id is on the model,
            // not on attrs. Regression: a previous spread `{...attrs, type}`
            // sent id-less resources, so the eager facade's id-fallback hit
            // /404/ for every post.
            const stripped = {};

            urlUtil.forPost('post-id', stripped, {options: {}});

            sinon.assert.calledOnce(getUrlForResourceStub);
            const [resource] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.id, 'post-id');
            assert.equal(resource.type, 'posts');
        });

        it('routes pages through the pages router type when the mapper passes type=pages', function () {
            // The pages mapper delegates to the posts mapper, which derives
            // the router type from the model (which is reliable even under
            // `?fields=url`) and passes it explicitly to forPost. Regression:
            // a previous version derived the type from `attrs.type` directly,
            // which silently fell back to 'posts' when fields stripped the
            // type column.
            const stripped = {};

            urlUtil.forPost('page-id', stripped, {options: {}}, 'pages');

            sinon.assert.calledOnce(getUrlForResourceStub);
            const [resource] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.id, 'page-id');
            assert.equal(resource.type, 'pages');
        });

        it('defaults to posts when no type is passed', function () {
            // Other callers of forPost (comments mapper, activity-feed-events)
            // pass post records and rely on the default.
            const stripped = {};

            urlUtil.forPost('post-id', stripped, {options: {}});

            sinon.assert.calledOnce(getUrlForResourceStub);
            const [resource] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.id, 'post-id');
            assert.equal(resource.type, 'posts');
        });
    });

    describe('forTag', function () {
        it('passes a tags resource to the facade when url is requested', function () {
            const tag = {id: 'tag1', slug: 'food', name: 'Food'};

            urlUtil.forTag(tag.id, tag, {});

            assert.equal(tag.url, 'getUrlForResource');
            sinon.assert.calledOnce(getUrlForResourceStub);
            const [resource, options] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.type, 'tags');
            assert.equal(resource.id, 'tag1');
            assert.equal(resource.slug, 'food');
            assert.deepEqual(options, {absolute: true});
        });

        it('skips url generation when columns excludes url', function () {
            const tag = {id: 'tag1', slug: 'food'};

            urlUtil.forTag(tag.id, tag, {columns: ['id', 'slug']});

            assert.equal(tag.url, undefined);
            sinon.assert.notCalled(getUrlForResourceStub);
        });
    });

    describe('forUser', function () {
        it('passes an authors resource to the facade when url is requested', function () {
            const user = {id: 'user1', slug: 'jane', name: 'Jane'};

            urlUtil.forUser(user.id, user, {});

            assert.equal(user.url, 'getUrlForResource');
            sinon.assert.calledOnce(getUrlForResourceStub);
            const [resource, options] = getUrlForResourceStub.firstCall.args;
            assert.equal(resource.type, 'authors');
            assert.equal(resource.id, 'user1');
            assert.equal(resource.slug, 'jane');
            assert.deepEqual(options, {absolute: true});
        });

        it('skips url generation when columns excludes url', function () {
            const user = {id: 'user1', slug: 'jane'};

            urlUtil.forUser(user.id, user, {columns: ['id', 'slug']});

            assert.equal(user.url, undefined);
            sinon.assert.notCalled(getUrlForResourceStub);
        });
    });
});
