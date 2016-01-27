/*globals describe, it*/
var getMetaDescription = require('../../../server/data/meta/description');

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

    it('should return data author bio if on root context contains author', function () {
        var description = getMetaDescription({
            author: {
                bio: 'Just some hack building code to make the world better.'
            }
        }, {
            context: ['author']
        });
        description.should.equal('Just some hack building code to make the world better.');
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

    it('should return data tag description if no meta description for tag', function () {
        var description = getMetaDescription({
            tag: {
                meta_description: '',
                description: 'The normal description'
            }
        }, {
            context: ['tag']
        });
        description.should.equal('The normal description');
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
