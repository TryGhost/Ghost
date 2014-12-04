/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    rewire         = require('rewire'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = rewire('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{ghost_foot}} helper', function () {
    var sandbox;

    before(function () {
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
        utils.restoreConfig();
        helpers.__set__('utils.isProduction', false);
    });

    describe('without Code Injection', function () {
        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            sandbox.stub(api.settings, 'read', function () {
                return Promise.resolve({
                    settings: [{value: ''}]
                });
            });
        });

        it('has loaded ghost_foot helper', function () {
            should.exist(handlebars.helpers.ghost_foot);
        });

        it('outputs correct jquery for development mode', function (done) {
            utils.overrideConfig({assetHash: 'abc'});

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.js\?v=abc"><\/script>/);

                done();
            }).catch(done);
        });

        it('outputs correct jquery for production mode', function (done) {
            utils.overrideConfig({assetHash: 'abc'});
            helpers.__set__('utils.isProduction', true);

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.min.js\?v=abc"><\/script>/);

                done();
            }).catch(done);
        });
    });

    describe('with Code Injection', function () {
        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            sandbox.stub(api.settings, 'read', function () {
                return Promise.resolve({
                    settings: [{value: '<script></script>'}]
                });
            });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('outputs correct jquery for development mode', function (done) {
            utils.overrideConfig({assetHash: 'abc'});

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.js\?v=abc"><\/script> <script><\/script>/);

                done();
            }).catch(done);
        });

        it('outputs correct jquery for production mode', function (done) {
            utils.overrideConfig({assetHash: 'abc'});
            helpers.__set__('utils.isProduction', true);

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.min.js\?v=abc"><\/script> <script><\/script>/);

                done();
            }).catch(done);
        });
    });
});
