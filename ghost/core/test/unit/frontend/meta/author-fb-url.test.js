const assert = require('node:assert/strict');
const getAuthorFacebookUrl = require('../../../../core/frontend/meta/author-fb-url');

describe('getAuthorFacebookUrl', function () {
    it('should return author facebook url if post and has url',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['post'],
                post: {
                    primary_author: {
                        facebook: 'https://www.facebook.com/user'
                    }
                }
            });
            assert.equal(facebookUrl, 'https://www.facebook.com/user');
        });

    it('should return null if context does not contain author facebook url and is a post',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['post'],
                post: {
                    primary_author: {
                        facebook: ''
                    }
                }
            });
            assert.equal(facebookUrl, null);
        });

    it('should return null if context does not contain author and is a post', function () {
        const facebookUrl = getAuthorFacebookUrl({
            context: ['post'],
            post: {}
        });
        assert.equal(facebookUrl, null);
    });

    it('should return author facebook url if author and has url',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: 'https://www.facebook.com/user'
                }
            });
            assert.equal(facebookUrl, 'https://www.facebook.com/user');
        });

    it('should return null if context does not contain author facebook url and is a author',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: ''
                }
            });
            assert.equal(facebookUrl, null);
        });

    it('should return null if context is not a post', function () {
        const facebookUrl = getAuthorFacebookUrl({
            context: ['tag']
        });
        assert.equal(facebookUrl, null);
    });
});
