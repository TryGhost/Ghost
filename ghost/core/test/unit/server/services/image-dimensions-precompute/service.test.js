const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const ImageDimensionsPrecomputeService = require('../../../../../core/server/services/image-dimensions-precompute/service');

// Build a minimal bookshelf-like model: get() reads properties, related() reads relations.
// `changed` optionally lists which fields changed in this save. Ghost exposes that as the
// `_changed` snapshot — bookshelf has already reset `model.changed` (what `hasChanged()`
// reads) by the time the `*.edited`/`*.added` event fires, so the service consults
// `_changed` instead. When `changed` is omitted there is no `_changed` at all (mirrors
// non-bookshelf/test models), in which case every field is treated as changed.
function createModel(properties = {}, relations = {}, changed) {
    const model = {
        get: property => properties[property],
        related: relation => relations[relation]
    };
    if (changed) {
        model._changed = {};
        for (const field of changed) {
            model._changed[field] = properties[field];
        }
    }
    return model;
}

describe('ImageDimensionsPrecomputeService', function () {
    let getCachedImageSizeFromUrl;
    let addJob;
    let jobService;
    let service;

    beforeEach(function () {
        getCachedImageSizeFromUrl = sinon.stub().resolves({width: 10, height: 10});
        // Run enqueued jobs immediately so we can assert on their effects.
        addJob = sinon.stub().callsFake(async (name, fn) => fn());
        jobService = {addJob};
        service = new ImageDimensionsPrecomputeService({getCachedImageSizeFromUrl, jobService});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('listen', function () {
        it('subscribes to post, user and settings events', function () {
            const on = sinon.stub();
            service.listen({on});

            const subscribed = on.getCalls().map(call => call.args[0]);
            assert.ok(subscribed.includes('post.added'));
            assert.ok(subscribed.includes('post.edited'));
            assert.ok(subscribed.includes('page.added'));
            assert.ok(subscribed.includes('page.edited'));
            assert.ok(subscribed.includes('user.added'));
            assert.ok(subscribed.includes('user.edited'));
            // `user.edited` already covers the active-user case, so we must not also
            // subscribe to `user.activated.edited` (it would double-enqueue the job).
            assert.ok(!subscribed.includes('user.activated.edited'));
            for (const key of ImageDimensionsPrecomputeService.SETTING_KEYS) {
                assert.ok(subscribed.includes(`settings.${key}.edited`), `missing settings.${key}.edited`);
            }
        });
    });

    describe('warm', function () {
        it('enqueues a single job and warms each unique non-empty URL once', async function () {
            await service.warm([
                'https://example.com/a.jpg',
                'https://example.com/a.jpg', // duplicate
                'https://example.com/b.jpg',
                null,
                undefined,
                '',
                false
            ]);

            assert.equal(addJob.callCount, 1);
            assert.equal(addJob.firstCall.args[0], 'precompute-image-dimensions');
            assert.equal(getCachedImageSizeFromUrl.callCount, 2);
            const warmed = getCachedImageSizeFromUrl.getCalls().map(call => call.args[0]);
            assert.deepEqual(warmed, ['https://example.com/a.jpg', 'https://example.com/b.jpg']);
        });

        it('does not enqueue a job when there are no usable URLs', async function () {
            await service.warm([null, undefined, '', false]);
            assert.equal(addJob.callCount, 0);
        });

        it('is best-effort: a rejecting getter does not throw out of the job', async function () {
            const errorStub = sinon.stub(logging, 'error');
            getCachedImageSizeFromUrl.rejects(new Error('probe failed'));

            await service.warm(['https://example.com/broken.jpg']);

            assert.equal(addJob.callCount, 1);
            assert.ok(errorStub.calledOnce);
        });

        it('is best-effort: a throwing job enqueue does not propagate', function () {
            const errorStub = sinon.stub(logging, 'error');
            addJob.throws(new Error('queue shut down'));

            assert.doesNotThrow(() => service.warm(['https://example.com/a.jpg']));
            assert.ok(errorStub.calledOnce);
        });
    });

    describe('handlePostChange', function () {
        it('warms feature_image plus posts_meta og/twitter images', async function () {
            const model = createModel(
                {feature_image: 'https://example.com/feature.jpg'},
                {posts_meta: createModel({
                    og_image: 'https://example.com/og.jpg',
                    twitter_image: 'https://example.com/twitter.jpg'
                })}
            );

            await service.handlePostChange(model, {});

            const warmed = getCachedImageSizeFromUrl.getCalls().map(call => call.args[0]);
            assert.deepEqual(warmed, [
                'https://example.com/feature.jpg',
                'https://example.com/og.jpg',
                'https://example.com/twitter.jpg'
            ]);
        });

        it('handles a missing posts_meta relation', async function () {
            const model = createModel({feature_image: 'https://example.com/feature.jpg'}, {});
            await service.handlePostChange(model, {});
            assert.equal(getCachedImageSizeFromUrl.callCount, 1);
            assert.equal(getCachedImageSizeFromUrl.firstCall.args[0], 'https://example.com/feature.jpg');
        });

        it('does nothing when no image fields are set', function () {
            const model = createModel({feature_image: null}, {posts_meta: createModel({})});
            service.handlePostChange(model, {});
            assert.equal(addJob.callCount, 0);
        });

        it('skips importing writes', function () {
            const model = createModel({feature_image: 'https://example.com/feature.jpg'}, {});
            service.handlePostChange(model, {importing: true});
            assert.equal(addJob.callCount, 0);
        });

        it('skips internal-context writes', function () {
            const model = createModel({feature_image: 'https://example.com/feature.jpg'}, {});
            service.handlePostChange(model, {context: {internal: true}});
            assert.equal(addJob.callCount, 0);
        });

        it('only warms image fields that changed when change tracking is available', async function () {
            // feature_image set but unchanged (e.g. an unrelated edit) -> not warmed
            const model = createModel(
                {feature_image: 'https://example.com/feature.jpg'},
                {posts_meta: createModel({og_image: 'https://example.com/og.jpg'}, {}, ['og_image'])},
                ['title'] // only title changed
            );

            await service.handlePostChange(model, {});

            const warmed = getCachedImageSizeFromUrl.getCalls().map(call => call.args[0]);
            assert.deepEqual(warmed, ['https://example.com/og.jpg']);
        });
    });

    describe('handleUserChange', function () {
        it('warms profile_image and cover_image', async function () {
            const model = createModel({
                profile_image: 'https://example.com/profile.jpg',
                cover_image: 'https://example.com/cover.jpg'
            });

            await service.handleUserChange(model, {});

            const warmed = getCachedImageSizeFromUrl.getCalls().map(call => call.args[0]);
            assert.deepEqual(warmed, [
                'https://example.com/profile.jpg',
                'https://example.com/cover.jpg'
            ]);
        });

        it('does not warm when only non-image fields changed (e.g. last_seen)', function () {
            // Mirrors updateLastSeen(): the user is saved but profile_image is unchanged.
            const model = createModel(
                {profile_image: 'https://example.com/profile.jpg', last_seen: 'now'},
                {},
                ['last_seen']
            );

            service.handleUserChange(model, {});

            assert.equal(addJob.callCount, 0);
            assert.equal(getCachedImageSizeFromUrl.callCount, 0);
        });

        it('uses the _changed snapshot, not hasChanged() (which is reset before the event)', function () {
            // Regression: bookshelf resets `model.changed` before firing the `*.edited`
            // event, so `hasChanged()` always reports nothing changed by the time we run.
            // The change set only survives on `_changed`. A model whose `hasChanged()`
            // says "nothing changed" but whose `_changed` snapshot includes profile_image
            // must still be warmed.
            const model = createModel(
                {profile_image: 'https://example.com/profile.jpg'},
                {},
                ['profile_image']
            );
            // Mirror real bookshelf: hasChanged() reads the (already reset) `changed` map.
            model.hasChanged = () => false;

            service.handleUserChange(model, {});

            assert.equal(getCachedImageSizeFromUrl.callCount, 1);
            assert.equal(getCachedImageSizeFromUrl.firstCall.args[0], 'https://example.com/profile.jpg');
        });
    });

    describe('handleSettingChange', function () {
        it('warms the setting value', async function () {
            const model = createModel({key: 'logo', value: 'https://example.com/logo.png'});
            await service.handleSettingChange(model, {});
            assert.equal(getCachedImageSizeFromUrl.callCount, 1);
            assert.equal(getCachedImageSizeFromUrl.firstCall.args[0], 'https://example.com/logo.png');
        });

        it('does nothing when the setting value is empty', function () {
            const model = createModel({key: 'logo', value: ''});
            service.handleSettingChange(model, {});
            assert.equal(addJob.callCount, 0);
        });

        it('does not warm when the value did not change', function () {
            // Setting row saved but `value` unchanged (some other column changed).
            const model = createModel(
                {key: 'logo', value: 'https://example.com/logo.png'},
                {},
                ['updated_at']
            );
            service.handleSettingChange(model, {});
            assert.equal(addJob.callCount, 0);
            assert.equal(getCachedImageSizeFromUrl.callCount, 0);
        });
    });
});
