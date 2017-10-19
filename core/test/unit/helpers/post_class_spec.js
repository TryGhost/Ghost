var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{post_class}} helper', function () {
    it('can render class string', function () {
        var rendered = helpers.post_class.call({});

        should.exist(rendered);
        rendered.string.should.equal('post');
    });

    it('can render featured class', function () {
        var post = {featured: true},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post featured');
    });

    it('can render page class', function () {
        var post = {page: true},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post page');
    });
});
