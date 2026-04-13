const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

const postsMapper = rewire('../../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers/posts');

describe('Posts output mapper', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('preserves false values for x_post_enabled', async function () {
        postsMapper.__set__('url', {forPost: sinon.stub()});
        postsMapper.__set__('extraAttrs', {forPost: sinon.stub()});
        postsMapper.__set__('clean', {post: sinon.stub()});
        postsMapper.__set__('utils', {isContentAPI: () => false});

        const result = await postsMapper({
            id: 'post_1',
            email_recipient_filter: null,
            posts_meta: {
                x_post_enabled: false
            }
        }, {
            options: {}
        }, {
            tiers: []
        });

        assert.equal(result.x_post_enabled, false);
    });
});
