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
        it('sets frame.apiType to content when a member_status is provided', function () {
            const frame = {options: {member_status: 'free'}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
        });

        it('does not set frame.apiType when no member_status is provided', function () {
            const frame = {options: {}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, undefined);
        });

        it('sets frame.original.context.member.status to free when member_status is free', function () {
            const frame = {options: {member_status: 'free'}};
            previewsController.read.query(frame);

            assert.equal(frame.original.context.member.status, 'free');
        });

        it('sets frame.original.context.member.status to paid when member_status is paid', function () {
            const frame = {options: {member_status: 'paid'}};
            previewsController.read.query(frame);

            assert.equal(frame.original.context.member.status, 'paid');
        });

        it('sets frame.apiType but does not set member context when member_status is anonymous', function () {
            const frame = {options: {member_status: 'anonymous'}};
            previewsController.read.query(frame);

            assert.equal(frame.apiType, 'content');
            assert.equal(frame.original.context.member, undefined);
        });
    });
});
