var should = require('should'),
    getCreatorTwitterUrl = require('../../../../core/frontend/meta/creator_url');

describe('getCreatorTwitterUrl', function () {
    it('should return author twitter url if post and has url',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['post'],
                post: {
                    primary_author: {
                        twitter: 'https://twitter.com/user'
                    }
                }
            });
            twitterUrl.should.equal('https://twitter.com/user');
        });

    it('should return null if context does not contain author twitter url and is a post',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['post'],
                post: {
                    primary_author: {
                        twitter: ''
                    }
                }
            });
            should(twitterUrl).equal(null);
        });

    it('should return null if context does not contain author and is a post', function () {
        var twitterUrl = getCreatorTwitterUrl({
            context: ['post'],
            post: {}
        });
        should(twitterUrl).equal(null);
    });

    it('should return author twitter url if AMP post and has url',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['amp', 'post'],
                post: {
                    primary_author: {
                        twitter: 'https://twitter.com/user'
                    }
                }
            });
            twitterUrl.should.equal('https://twitter.com/user');
        });

    it('should return null if context does not contain author twitter url and is an AMP post',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['amp', 'post'],
                post: {
                    primary_author: {
                        twitter: ''
                    }
                }
            });
            should(twitterUrl).equal(null);
        });

    it('should return null if context does not contain author and is an AMP post', function () {
        var twitterUrl = getCreatorTwitterUrl({
            context: ['amp', 'post'],
            post: {}
        });
        should(twitterUrl).equal(null);
    });

    it('should return author twitter url if author and has url',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['author'],
                author: {
                    twitter: 'https://twitter.com/user'
                }
            });
            twitterUrl.should.equal('https://twitter.com/user');
        });

    it('should return null if context does not contain author twitter url and is a author',
        function () {
            var twitterUrl = getCreatorTwitterUrl({
                context: ['author'],
                author: {
                    twitter: ''
                }
            });
            should(twitterUrl).equal(null);
        });

    it('should return null if context is not a post', function () {
        var twitterUrl = getCreatorTwitterUrl({
            context: ['tag']
        });
        should(twitterUrl).equal(null);
    });
});
