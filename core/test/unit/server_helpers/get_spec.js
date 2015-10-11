/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    Promise        = require('bluebird'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{#get}} helper', function () {
    var sandbox;

    before(function () {
        utils.loadHelpers();
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('has loaded get block helper', function () {
        should.exist(handlebars.helpers.get);
    });

    describe('posts', function () {
        var testPostsObj = {
            posts: [
                {id: 1}
            ]
        };
        beforeEach(function () {
            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve(testPostsObj);
            });
        });

        it('should handle default posts call', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.true;
                fn.firstCall.args[0].should.be.an.Object;
                fn.firstCall.args[0].should.eql(testPostsObj);
                inverse.called.should.be.false;

                done();
            }).catch(done);
        });
    });
});
