const assert = require('assert');

const Resources = require('../../../../../core/server/services/url/Resources');

describe('Unit: services/url/Resources', function () {
    describe('_onResourceUpdated', function () {
        it('does not start the queue when non-routing properties were changed', async function () {
            const resources = new Resources({
                resourcesConfig: [{
                    type: 'post',
                    modelOptions: {
                        modelName: 'Post',
                        exclude: [
                            'title',
                            'mobiledoc',
                            'lexical',
                            'html',
                            'plaintext'
                        ]
                    }
                }]
            });

            const postModelMock = {
                _changed: {
                    title: 'New Title',
                    plaintext: 'New plaintext'
                }
            };

            const updated = await resources._onResourceUpdated('post', postModelMock);

            assert.equal(updated, false);
        });
    });
});
