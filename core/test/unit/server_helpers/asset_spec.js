/*globals describe, before, after, it */
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{asset}} helper', function () {
    var rendered;

    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({assetHash: 'abc'});
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded asset helper', function () {
        should.exist(handlebars.helpers.asset);
    });

    describe('no subdirectory', function () {
        it('handles favicon correctly', function () {
            // with ghost set
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('shared/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/ghost/js/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');
        });
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            utils.overrideConfig({url: 'http://testurl.com/blog'});
        });

        it('handles favicon correctly', function () {
            // with ghost set
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('shared/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/ghost/js/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.js?v=abc');
        });
    });
});
