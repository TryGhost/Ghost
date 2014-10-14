/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{author}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded author helper', function () {
        should.exist(handlebars.helpers.author);
    });

    it('Returns the link to the author from the context', function () {
        var data = {author: {name: 'abc 123', slug: 'abc123', bio: '', website: '', status: '', location: ''}},
            result = helpers.author.call(data, {hash: {}});

        String(result).should.equal('<a href="/author/abc123/">abc 123</a>');
    });

    it('Returns the full name of the author from the context if no autolink', function () {
        var data = {author: {name: 'abc 123', slug: 'abc123'}},
            result = helpers.author.call(data, {hash: {autolink: 'false'}});

        String(result).should.equal('abc 123');
    });

    it('Returns a blank string where author data is missing', function () {
        var data = {author: null},
            result = helpers.author.call(data, {hash: {}});

        String(result).should.equal('');
    });

    it('Functions as block helper if called with #', function () {
        var data = {author: {name: 'abc 123', slug: 'abc123'}},
        // including fn emulates the #
            result = helpers.author.call(data, {hash: {}, fn: function () { return 'FN'; }});

        // It outputs the result of fn
        String(result).should.equal('FN');
    });
});
