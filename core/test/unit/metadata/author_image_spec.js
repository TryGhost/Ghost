var should = require('should'),
    sinon = require('sinon'),
    getAuthorImage = require('../../../server/data/meta/author_image'),
    sandbox = sinon.sandbox.create();

describe('getAuthorImage', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should return author image url if post and has url', function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, false);

        imageUrl.should.equal('/content/images/2016/01/myimage.jpg');
    });

    it('should return absolute author image url if post and has url', function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, true);
        imageUrl.should.not.equal('/content/images/2016/01/myimage.jpg');
        imageUrl.should.match(/\/content\/images\/2016\/01\/myimage\.jpg$/);
    });

    it('should return author image url if AMP post and has url', function () {
        var imageUrl = getAuthorImage({
            context: ['amp', 'post'],
            post: {
                author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, false);
        imageUrl.should.equal('/content/images/2016/01/myimage.jpg');
    });

    it('should return absolute author image url if AMP post and has url', function () {
        var imageUrl = getAuthorImage({
            context: ['amp', 'post'],
            post: {
                author: {
                    profile_image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, true);
        imageUrl.should.not.equal('/content/images/2016/01/myimage.jpg');
        imageUrl.should.match(/\/content\/images\/2016\/01\/myimage\.jpg$/);
    });

    it('should return null if context does not contain author image url and is a post', function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                author: {
                    name: 'Test Author'
                }
            }
        });

        should(imageUrl).equal(null);
    });

    it('should return null if context does not contain author and is a post', function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {}
        });

        should(imageUrl).equal(null);
    });

    it('should return null if context is not a post', function () {
        var imageUrl = getAuthorImage({
            context: ['tag']
        });

        should(imageUrl).equal(null);
    });
});
