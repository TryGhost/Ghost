/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{input_password}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded input_password helper', function () {
        should.exist(handlebars.helpers.input_password);
    });

    it('returns the correct input', function () {
        var markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" />',
            rendered = helpers.input_password();
        should.exist(rendered);

        String(rendered).should.equal(markup);
    });
});
