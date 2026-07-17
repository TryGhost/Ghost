const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Post} = require('../../../../core/server/models/post');
const urlService = require('../../../../core/server/services/url');
const emailPostController = require('../../../../core/server/api/endpoints/email-post');

describe('Email post controller', function () {
    beforeEach(function () {
        sinon.stub(Post, 'findOne').resolves({});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#read', function () {
        it('lazyRouting: force-loads the URL service required relations', async function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);

            const frame = {data: {uuid: 'abc'}, options: {}};
            await emailPostController.read.query(frame);

            sinon.assert.calledOnce(Post.findOne);
            const options = Post.findOne.getCall(0).args[1];
            assert.deepEqual(options.withRelated, ['tags', 'authors']);
            // recorded so the output mapper strips them from the response
            assert.deepEqual(frame.forcedUrlRelations, ['tags', 'authors']);
        });

        it('lazyRouting: only forces the relations the caller did not include', async function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);

            const frame = {data: {uuid: 'abc'}, options: {withRelated: ['tags']}};
            await emailPostController.read.query(frame);

            const options = Post.findOne.getCall(0).args[1];
            assert.deepEqual(options.withRelated, ['tags', 'authors']);
            assert.deepEqual(frame.forcedUrlRelations, ['authors']);
        });

        it('fetches sent posts by uuid', async function () {
            sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);

            const frame = {data: {uuid: 'abc'}, options: {}};
            await emailPostController.read.query(frame);

            const data = Post.findOne.getCall(0).args[0];
            assert.equal(data.uuid, 'abc');
            assert.equal(data.status, 'sent');
        });
    });
});
