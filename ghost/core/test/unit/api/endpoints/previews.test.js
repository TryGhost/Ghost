const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Post} = require('../../../../core/server/models/post');
const {Product} = require('../../../../core/server/models/product');
const urlService = require('../../../../core/server/services/url');
const previewsController = require('../../../../core/server/api/endpoints/previews');

describe('Previews controller', function () {
    beforeEach(function () {
        sinon.stub(Post, 'findOne').resolves({});
        sinon.stub(Product, 'findAll').resolves([{
            get: sinon.stub().returns('silver')
        }]);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#read', function () {
        // The previews response serializes `url` through the same posts
        // mapper as the other endpoints, so the lazy URL service's required
        // relations must be loaded here too — a published post previewed on a
        // site with tag-filtered collections is otherwise rejected as thin.
        it('lazyRouting: force-loads the URL service required relations', async function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);

            const frame = {options: {}};
            await previewsController.read.query(frame);

            sinon.assert.calledOnce(Post.findOne);
            const options = Post.findOne.getCall(0).args[1];
            assert.deepEqual(options.withRelated, ['tags', 'authors']);
            // recorded so the output mapper strips them from the response
            assert.deepEqual(frame.forcedUrlRelations, ['tags', 'authors']);
        });

        it('lazyRouting: only forces the relations the caller did not include', async function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);

            const frame = {options: {withRelated: ['tags']}};
            await previewsController.read.query(frame);

            const options = Post.findOne.getCall(0).args[1];
            assert.deepEqual(options.withRelated, ['tags', 'authors']);
            assert.deepEqual(frame.forcedUrlRelations, ['authors']);
        });

        it('sets frame.apiType to content when a member_status is provided', async function () {
            const frame = {options: {member_status: 'free'}};
            await previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
        });

        it('does not set frame.apiType when no member_status is provided', async function () {
            const frame = {options: {}};
            await previewsController.read.query(frame);

            assert.equal(frame.apiType, undefined);
        });

        it('sets frame.original.context.member.status to free when member_status is free', async function () {
            const frame = {options: {member_status: 'free'}};
            await previewsController.read.query(frame);

            assert.equal(frame.original.context.member.status, 'free');
        });

        it('sets frame.original.context.member.status to paid when member_status is paid', async function () {
            const frame = {options: {member_status: 'paid'}};
            await previewsController.read.query(frame);

            assert.equal(frame.original.context.member.status, 'paid');
            assert.equal(frame.original.context.member.products.length, 1);
            assert.equal(frame.original.context.member.products[0].slug, 'silver');
        });

        it('sets frame.apiType but does not set member context when member_status is anonymous', async function () {
            const frame = {options: {member_status: 'anonymous'}};
            await previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
            assert.equal(frame.original.context.member, undefined);
        });
    });
});
