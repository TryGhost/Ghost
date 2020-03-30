var should = require('should'),

    // Stuff we are testing
    helpers = require('../../../core/frontend/helpers');

describe('{{post_class}} helper', function () {
    it('can render class string', function () {
        var rendered = helpers.post_class.call({});

        should.exist(rendered);
        rendered.string.should.equal('post no-image');
    });

    it('can render class string without no-image class', function () {
        var rendered = helpers.post_class.call({feature_image: 'blah'});

        should.exist(rendered);
        rendered.string.should.equal('post');
    });

    it('can render featured class', function () {
        var post = {featured: true},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post featured no-image');
    });

    it('can render featured class without no-image class', function () {
        var post = {featured: true, feature_image: 'asdass'},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post featured');
    });

    it('can render page class', function () {
        var post = {page: true},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post no-image page');
    });

    it('can render page class without no-image class', function () {
        var post = {page: true, feature_image: 'asdasdas'},
            rendered = helpers.post_class.call(post);

        should.exist(rendered);
        rendered.string.should.equal('post page');
    });
});
