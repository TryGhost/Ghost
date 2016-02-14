/*globals describe, before, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{post_class}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded postclass helper', function () {
        should.exist(handlebars.helpers.post_class);
    });

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
