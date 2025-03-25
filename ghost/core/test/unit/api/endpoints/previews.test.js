const assert = require('assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const previewsController = require('../../../../core/server/api/endpoints/previews');

describe('Previews controller', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(models.Post, 'findOne').resolves({});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#read', function () {
        it('sets frame.apiType to content when a memberStatus is provided', function () {
            const frame = {data: {uuid: 'test'}, options: {memberStatus: 'free'}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
        });

        it('does not set frame.apiType when no memberStatus is provided', function () {
            const frame = {data: {uuid: 'test'}, options: {}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, undefined);
        });

        it('sets frame.options.context.member.status to free when memberStatus is free', function () {
            const frame = {data: {uuid: 'test'}, options: {memberStatus: 'free'}};
            previewsController.read.query(frame);

            assert.equal(frame.options.context.member.status, 'free');
        });

        it('sets frame.options.context.member.status to paid when memberStatus is paid', function () {
            const frame = {data: {uuid: 'test'}, options: {memberStatus: 'paid'}};
            previewsController.read.query(frame);

            assert.equal(frame.options.context.member.status, 'paid');
        });

        it('sets frame.apiType but does not set member context when memberStatus is anonymous', function () {
            const frame = {data: {uuid: 'test'}, options: {memberStatus: 'anonymous'}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
            assert.equal(frame.options.context.member, undefined);
        });

        it('sets frame.apiType but does not set member context when memberStatus is unknown', function () {
            const frame = {data: {uuid: 'test'}, options: {memberStatus: 'not-a-status'}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
            assert.equal(frame.options.context.member, undefined);
        });
    });
});
