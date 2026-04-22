const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const previewsController = require('../../../../core/server/api/endpoints/previews');

describe('Previews controller', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(models.Post, 'findOne').resolves({});
        sinon.stub(models.Product, 'findAll').resolves([{
            get: sinon.stub().returns('silver')
        }]);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#read', function () {
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
