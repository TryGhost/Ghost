const assert = require('node:assert/strict');
const sinon = require('sinon');

const {Post} = require('../../../../../core/server/models/post');
const {Member} = require('../../../../../core/server/models/member');

const serialize = require('../../../../../core/server/services/webhooks/serialize');

// Mocked internals
const tiersService = require('../../../../../core/server/services/tiers');

const {fixtureManager} = require('../../../../utils/e2e-framework');

describe('WebhookService - Serialize', function () {
    beforeEach(function () {
        tiersService.api = {
            browse() {
                return {};
            }
        };
    });

    afterEach(function () {
        tiersService.api = null;
        sinon.restore();
    });

    it('rejects with no arguments', async function () {
        await assert.rejects(
            async () => {
                await serialize();
            },
            (error) => {
                assert.equal(error.name, 'TypeError');
                return true;
            }
        );
    });

    it('rejects with no model', async function () {
        await assert.rejects(
            async () => {
                await serialize('fake.hook');
            },
            (error) => {
                assert.equal(error.name, 'TypeError');
                return true;
            }
        );
    });

    it('can serialize a basic model', async function () {
        const fakeModel = {
            attributes: {},
            _previousAttributes: {}
        };

        const result = await serialize('test.hook', fakeModel);
        assert.deepEqual(result, {test: {current: {}, previous: {}}});
    });

    it('can serialize a new post', async function () {
        const post = fixtureManager.get('posts', 1);
        const postModel = new Post(post);

        const result = await serialize('post.added', postModel);

        assert.ok(result.post, 'Should be wrapped in post');
        assert.deepEqual(result.post.previous, {});
        // @TODO: use snapshot matching here
        assert.equal(result.post.current.reading_time, 1, 'The reading time generated field should be present');
    });

    it('can serialize an edited post', async function () {
        const post = fixtureManager.get('posts', 1);
        const postModel = new Post(post);

        // We use both _previousAttributes and _changed in the webhook serializer
        postModel._previousAttributes.title = post.title;
        postModel._changed = {title: post.title};
        postModel.attributes.title = 'A brand new title';

        const result = await serialize('post.edited', postModel);

        assert.ok(result.post, 'Should be wrapped in post');
        // @TODO: use snapshot matching here
        assert.equal(result.post.current.title, 'A brand new title', 'The updated title should be present');
        assert.equal(result.post.previous.title, 'Ghostly Kitchen Sink', 'The previous title should also be present');
    });

    it('can serialize reconstructed member.edited model event state', async function () {
        const previousUpdatedAt = new Date('2026-04-28T15:55:45.000Z');
        const currentUpdatedAt = new Date('2026-05-29T00:00:00.000Z');
        const memberModel = new Member({
            id: 'member-id',
            uuid: 'member-uuid',
            email: 'member@example.com',
            status: 'free',
            created_at: previousUpdatedAt,
            updated_at: currentUpdatedAt
        });

        sinon.stub(memberModel, 'load').resolves(memberModel);
        memberModel._previousAttributes = {
            ...memberModel.attributes,
            status: 'comped',
            updated_at: previousUpdatedAt
        };
        memberModel._changed = {
            status: 'free',
            updated_at: currentUpdatedAt
        };

        const result = await serialize('member.edited', memberModel);

        sinon.assert.calledOnceWithExactly(memberModel.load, [
            'labels',
            'products',
            'newsletters'
        ]);
        assert.equal(result.member.current.status, 'free');
        assert.equal(result.member.current.comped, false);
        assert.deepEqual(result.member.current.updated_at, currentUpdatedAt);
        assert.equal(result.member.previous.status, 'comped');
        assert.deepEqual(result.member.previous.updated_at, previousUpdatedAt);
        assert.deepEqual(Object.keys(result.member.previous).sort(), ['status', 'updated_at']);
    });
});
