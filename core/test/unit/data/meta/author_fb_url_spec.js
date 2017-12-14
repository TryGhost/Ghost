var should = require('should'),
    getAuthorFacebookUrl = require('../../../../server/data/meta/author_fb_url');

describe('getAuthorFacebookUrl', function () {
    it('should return author facebook url if post and has url',
        function () {
            var facebookUrl = getAuthorFacebookUrl({
                context: ['post'],
                post: {
                    author: {
                        facebook: 'https://www.facebook.com/user'
                    }
                }
            });
            facebookUrl.should.equal('https://www.facebook.com/user');
        });

    it('should return author facebook url if AMP post and has url',
        function () {
            var facebookUrl = getAuthorFacebookUrl({
                context: ['amp', 'post'],
                post: {
                    author: {
                        facebook: 'https://www.facebook.com/user'
                    }
                }
            });
            facebookUrl.should.equal('https://www.facebook.com/user');
        });

    it('should return null if context does not contain author facebook url and is a post',
        function () {
            var facebookUrl = getAuthorFacebookUrl({
                context: ['post'],
                post: {
                    author: {
                        facebook: ''
                    }
                }
            });
            should(facebookUrl).equal(null);
        });

    it('should return null if context does not contain author and is a post', function () {
        var facebookUrl = getAuthorFacebookUrl({
            context: ['post'],
            post: {}
        });
        should(facebookUrl).equal(null);
    });

    it('should return author facebook url if author and has url',
        function () {
            var facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: 'https://www.facebook.com/user'
                }
            });
            facebookUrl.should.equal('https://www.facebook.com/user');
        });

    it('should return null if context does not contain author facebook url and is a author',
        function () {
            var facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: ''
                }
            });
            should(facebookUrl).equal(null);
        });

    it('should return null if context is not a post', function () {
        var facebookUrl = getAuthorFacebookUrl({
            context: ['tag']
        });
        should(facebookUrl).equal(null);
    });
});
