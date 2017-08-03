var should = require('should'), // jshint ignore:line
    getMetaDescription = require('../../../server/data/meta/description');

describe('getMetaDescription', function () {
    it('should return meta_description if on data root', function () {
        var description = getMetaDescription({
            meta_description: 'My test description.'
        });
        description.should.equal('My test description.');
    });

    it('should return empty string if on root context contains paged', function () {
        var description = getMetaDescription({}, {
            context: ['paged']
        });
        description.should.equal('');
    });

    it('should not return meta description for author if on root context contains author and no meta description provided', function () {
        var description = getMetaDescription({
            author: {
                bio: 'Just some hack building code to make the world better.'
            }
        }, {
            context: ['author']
        });
        description.should.equal('');
    });

    it('should return meta description for author if on root context contains author and meta description provided', function () {
        var description = getMetaDescription({
            author: {
                bio: 'Just some hack building code to make the world better.',
                meta_description: 'Author meta description.'
            }
        }, {
            context: ['author']
        });
        description.should.equal('Author meta description.');
    });

    it('should return data tag meta description if on root context contains tag', function () {
        var description = getMetaDescription({
            tag: {
                meta_description: 'Best tag ever!'
            }
        }, {
            context: ['tag']
        });
        description.should.equal('Best tag ever!');
    });

    it('should not return data tag description if no meta description for tag', function () {
        var description = getMetaDescription({
            tag: {
                meta_description: '',
                description: 'The normal description'
            }
        }, {
            context: ['tag']
        });
        description.should.equal('');
    });

    it('should return data post meta description if on root context contains post', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best post ever!'
            }
        }, {
            context: ['post']
        });
        description.should.equal('Best post ever!');
    });

    it('should return OG data post meta description if on root context contains post', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best post ever!',
                og_description: 'My custom Facebook description!'
            }
        }, {
            context: ['post']
        }, {
            property: 'og'
        });
        description.should.equal('My custom Facebook description!');
    });

    it('should not return data post meta description if on root context contains post and called with OG property', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best post ever!',
                og_description: ''
            }
        }, {
            context: ['post']
        }, {
            property: 'og'
        });
        description.should.equal('');
    });

    it('should return Twitter data post meta description if on root context contains post', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best post ever!',
                twitter_description: 'My custom Twitter description!'
            }
        }, {
            context: ['post']
        }, {
            property: 'twitter'
        });
        description.should.equal('My custom Twitter description!');
    });

    it('should return data post meta description if on root context contains post for an AMP post', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best AMP post ever!'
            }
        }, {
            context: ['amp', 'post']
        });
        description.should.equal('Best AMP post ever!');
    });

    it('should return data post meta description if on root context contains page', function () {
        var description = getMetaDescription({
            post: {
                meta_description: 'Best page ever!'
            }
        }, {
            context: ['page']
        });
        description.should.equal('Best page ever!');
    });
});
