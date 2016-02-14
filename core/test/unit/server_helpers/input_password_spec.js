/*globals describe, before, it*/
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

    it('returns the correct input when no custom options are specified', function () {
        var markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" />',
            rendered = helpers.input_password();
        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a custom class is specified', function () {
        var markup = '<input class="test-class" type="password" name="password" autofocus="autofocus" />',
            options = {
                hash: {
                    class: 'test-class'
                }
            },
            rendered = helpers.input_password(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a custom placeholder is specified', function () {
        var markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" placeholder="Test" />',
            options = {
                hash: {
                    placeholder: 'Test'
                }
            },
            rendered = helpers.input_password(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });
});
