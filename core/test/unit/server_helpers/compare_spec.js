var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars;

describe('{{#compare}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded compare block helper', function () {
        should.exist(handlebars.helpers.compare);
    });

    it('should throw exception when not enough arguments', function () {
        var errMess = '\'compare\' helper requires at least 2 arguments',
            runHelper;

        runHelper = function () {
            return function () {
                handlebars.helpers.compare.apply(this, arguments[0]);
            }.bind(this, Array.prototype.slice.call(arguments, 0));
        };

        runHelper().should.throwError(errMess);
        runHelper('single').should.throwError(errMess);
        runHelper('single', 'second').should.throwError(errMess);
    });

    it('should throw exception when operator is unknown', function () {
        var runHelper = function () {
            return function () {
                handlebars.helpers.compare.apply(this, arguments[0]);
            }.bind(this, Array.prototype.slice.call(arguments, 0));
        };

        runHelper(42, '@@', 42, {}).should.throwError('unknown @@ \'compare\' operator');
    });

    it('should use "===" as default operator when operator is not specified', function () {
        var fn = sinon.spy(),
            inverse = sinon.spy();

        handlebars.helpers.compare(1, 1, {fn: fn, inverse: inverse});

        fn.called.should.be.true();
        inverse.called.should.be.false();
    });
});
