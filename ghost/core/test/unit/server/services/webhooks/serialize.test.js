const assert = require('assert/strict');

const models = require('../../../../../core/server/models');

const serialize = require('../../../../../core/server/services/webhooks/serialize');

// Mocked internals
const tiersService = require('../../../../../core/server/services/tiers');

const {fixtureManager} = require('../../../../utils/e2e-framework');

describe('WebhookService - Serialize', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        tiersService.api = {
            browse() {
                return {};
            }
        };
    });

    afterEach(function () {
        tiersService.api = null;
    });

    it('rejects with no arguments', async function () {
        assert.rejects(await serialize, {name: 'TypeError'});
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
        const postModel = new models.Post(post);

        const result = await serialize('post.added', postModel);

        assert.ok(result.post, 'Should be wrapped in post');
        assert.deepEqual(result.post.previous, {});
        // @TODO: use snapshot matching here
        assert.equal(result.post.current.reading_time, 1, 'The reading time generated field should be present');
    });

    it('can serialize an edited post', async function () {
        const post = fixtureManager.get('posts', 1);
        const postModel = new models.Post(post);

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
});
