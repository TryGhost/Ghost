/*globals describe, before, it*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    errors         = require('../../../server/errors');

describe('{{#is}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded is block helper', function () {
        should.exist(handlebars.helpers.is);
    });

    // All positive tests
    it('should match single context "index"', function () {
        var fn = sinon.spy(),
            inverse = sinon.spy();

        helpers.is.call(
            {},
            'index',
            {fn: fn, inverse: inverse, data: {root: {context: ['home', 'index']}}}
        );

        fn.called.should.be.true();
        inverse.called.should.be.false();
    });

    it('should match OR context "index, paged"', function () {
        var fn = sinon.spy(),
            inverse = sinon.spy();

        helpers.is.call(
            {},
            'index, paged',
            {fn: fn, inverse: inverse, data: {root: {context: ['tag', 'paged']}}}
        );

        fn.called.should.be.true();
        inverse.called.should.be.false();
    });

    it('should not match "paged"', function () {
        var fn = sinon.spy(),
            inverse = sinon.spy();

        helpers.is.call(
            {},
            'paged',
            {fn: fn, inverse: inverse, data: {root: {context: ['index', 'home']}}}
        );

        fn.called.should.be.false();
        inverse.called.should.be.true();
    });

    it('should log warning with no args', function () {
        var fn = sinon.spy(),
            inverse = sinon.spy(),
            logWarn = sinon.stub(errors, 'logWarn');

        helpers.is.call(
            {},
            undefined,
            {fn: fn, inverse: inverse, data: {root: {context: ['index', 'home']}}}
        );

        logWarn.called.should.be.true();
        fn.called.should.be.false();
        inverse.called.should.be.false();
    });
});
