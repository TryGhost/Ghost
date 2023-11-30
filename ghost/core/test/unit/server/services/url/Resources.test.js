const assert = require('assert/strict');

const Resources = require('../../../../../core/server/services/url/Resources');

describe('Unit: services/url/Resources', function () {
    const resources = new Resources({
        resourcesConfig: [{
            type: 'posts',
            modelOptions: {
                modelName: 'Post',
                exclude: [
                    'title',
                    'plaintext'
                ]
            }
        }]
    });

    describe('_onResourceUpdated', function () {
        it('does not start the queue when non-routing properties were changed', async function () {
            const postModelMock = {
                _changed: {
                    title: 'New Title',
                    plaintext: 'New plaintext'
                }
            };

            const updated = await resources._onResourceUpdated('posts', postModelMock);

            assert.equal(updated, false);
        });
    });

    describe('_containsRoutingAffectingChanges', function (){
        it('returns true when routing affecting properties were changed', async function () {
            const postModelMock = {
                _changed: {
                    title: 'New Title',
                    updated_at: new Date()
                }
            };

            const containsRoutingAffectingChanges = resources._containsRoutingAffectingChanges(postModelMock, ['title', 'updated_at']);

            assert.equal(containsRoutingAffectingChanges, false);
        });

        it('returns false when routing affecting properties were not changed', async function () {
            const postModelMock = {
                _changed: {
                    title: 'New Title',
                    slug: 'new-slug'
                }
            };

            const containsRoutingAffectingChanges = resources._containsRoutingAffectingChanges(postModelMock, ['title', 'updated_at']);

            assert.equal(containsRoutingAffectingChanges, true);
        });

        it('returns true when model does not contain changes', async function () {
            const postModelMock = {};

            const containsRoutingAffectingChanges = resources._containsRoutingAffectingChanges(postModelMock, ['title', 'updated_at']);

            assert.equal(containsRoutingAffectingChanges, true);
        });
    });
});
