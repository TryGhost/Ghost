var should = require('should'),
    sinon = require('sinon'),
    getAuthorImage = require('../../../../core/frontend/meta/author_image');

describe('getAuthorImage', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('should return author image url if post and has url', function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                primary_author: {
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
                primary_author: {
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
                primary_author: {
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
                primary_author: {
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
                primary_author: {
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
