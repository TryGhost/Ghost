/*globals describe, it*/
var getAuthorImage = require('../../../server/data/meta/author_image'),
    should = require('should'),
    config = require('../../../server/config');

describe('getAuthorImage', function () {
    it('should return author image url if post and has url',
    function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                author: {
                    image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, false);
        imageUrl.should.equal('/content/images/2016/01/myimage.jpg');
    });

    it('should return absolute author image url if post and has url',
    function () {
        var imageUrl = getAuthorImage({
            context: ['post'],
            post: {
                author: {
                    image: '/content/images/2016/01/myimage.jpg'
                }
            }
        }, true);
        imageUrl.should.not.equal('/content/images/2016/01/myimage.jpg');
        imageUrl.should.match(/\/content\/images\/2016\/01\/myimage\.jpg$/);
    });

    it('should return null if context does not contain author image url and is a post',
    function () {
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

    it('should return config theme auther image if context is a post and no post',
    function () {
        config.set({
            theme: {
                author: {
                    image: '/content/images/2016/01/myimage.jpg'
                }
            }
        });
        var imageUrl = getAuthorImage({
            context: ['post']
        });
        imageUrl.should.match(/\/content\/images\/2016\/01\/myimage\.jpg$/);
    });
});
