const assert = require('node:assert/strict');
const sinon = require('sinon');
const getAuthorImage = require('../../../../core/frontend/meta/author-image');

describe('getAuthorImage', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('should return author image url if post and has url', function () {
        const imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                primary_author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, false);

        assert.equal(imageUrl, '/content/images/2016/01/myimage.jpg');
    });

    it('should return absolute author image url if post and has url', function () {
        const imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                primary_author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, true);
        assert.notEqual(imageUrl, '/content/images/2016/01/myimage.jpg');
        assert.match(imageUrl, /\/content\/images\/2016\/01\/myimage\.jpg$/);
    });

    it('should return null if context does not contain author image url and is a post', function () {
        const imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                primary_author: {
                    name: 'Test Author'
                }
            }
        });

        assert.equal(imageUrl, null);
    });

    it('should return null if context does not contain author and is a post', function () {
        const imageUrl = getAuthorImage({
            context: ['post'],
            post: {}
        });

        assert.equal(imageUrl, null);
    });

    it('should return null if context is not a post', function () {
        const imageUrl = getAuthorImage({
            context: ['tag']
        });

        assert.equal(imageUrl, null);
    });
});
