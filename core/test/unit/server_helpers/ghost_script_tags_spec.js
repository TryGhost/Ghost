/*globals describe, before, after, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    rewire         = require('rewire'),
    utils          = require('./utils'),

// Stuff we are testing
    helpers        = rewire('../../../server/helpers');

// ## Admin only helpers
describe('ghost_script_tags helper', function () {
    var rendered;

    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({assetHash: 'abc'});
    });

    after(function () {
        utils.restoreConfig();
    });

    afterEach(function () {
        helpers.__set__('utils.isProduction', false);
    });

    it('has loaded ghostScriptTags  helper', function () {
        should.exist(helpers.ghost_script_tags);
    });

    it('outputs correct scripts for development mode', function () {
        rendered = helpers.ghost_script_tags();
        should.exist(rendered);
        String(rendered).should.equal(
                '<script src="/ghost/scripts/vendor-dev.js?v=abc"></script>' +
                '<script src="/ghost/scripts/templates-dev.js?v=abc"></script>' +
                '<script src="/ghost/scripts/ghost-dev.js?v=abc"></script>'
        );
    });

    it('outputs correct scripts for production mode', function () {
        helpers.__set__('utils.isProduction', true);

        rendered = helpers.ghost_script_tags();
        should.exist(rendered);
        String(rendered).should.equal(
                '<script src="/ghost/scripts/vendor.min.js?v=abc"></script>' +
                '<script src="/ghost/scripts/ghost.min.js?v=abc"></script>'
        );
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            utils.overrideConfig({url: 'http://testurl.com/blog'});
        });

        it('outputs correct scripts for development mode', function () {
            helpers.__set__('utils.isProduction', false);
            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal(
                    '<script src="/blog/ghost/scripts/vendor-dev.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/templates-dev.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/ghost-dev.js?v=abc"></script>'
            );
        });

        it('outputs correct scripts for production mode', function () {
            helpers.__set__('utils.isProduction', true);

            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal(
                    '<script src="/blog/ghost/scripts/vendor.min.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/ghost.min.js?v=abc"></script>'
            );
        });
    });
});
