const should = require('should');
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
            facebookUrl.should.equal('https://www.facebook.com/user');
        });

    it('should return author facebook url if AMP post and has url',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['amp', 'post'],
                post: {
                    primary_author: {
                        facebook: 'https://www.facebook.com/user'
                    }
                }
            });
            facebookUrl.should.equal('https://www.facebook.com/user');
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
            should(facebookUrl).equal(null);
        });

    it('should return null if context does not contain author and is a post', function () {
        const facebookUrl = getAuthorFacebookUrl({
            context: ['post'],
            post: {}
        });
        should(facebookUrl).equal(null);
    });

    it('should return author facebook url if author and has url',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: 'https://www.facebook.com/user'
                }
            });
            facebookUrl.should.equal('https://www.facebook.com/user');
        });

    it('should return null if context does not contain author facebook url and is a author',
        function () {
            const facebookUrl = getAuthorFacebookUrl({
                context: ['author'],
                author: {
                    facebook: ''
                }
            });
            should(facebookUrl).equal(null);
        });

    it('should return null if context is not a post', function () {
        const facebookUrl = getAuthorFacebookUrl({
            context: ['tag']
        });
        should(facebookUrl).equal(null);
    });
});
