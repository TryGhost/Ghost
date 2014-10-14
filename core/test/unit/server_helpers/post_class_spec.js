/*globals describe, before, it*/
/*jshint expr:true*/
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

    it('can render class string', function (done) {
        helpers.post_class.call({}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('post');
            done();
        }).catch(done);
    });

    it('can render featured class', function (done) {
        var post = {featured: true};

        helpers.post_class.call(post).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('post featured');

            done();
        }).catch(done);
    });

    it('can render page class', function (done) {
        var post = {page: true};

        helpers.post_class.call(post).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('post page');

            done();
        }).catch(done);
    });
});
