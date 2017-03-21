// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var should = require('should'),
    rewire = require('rewire'),

    // Stuff we are testing
    helpers = rewire('../../server/helpers');

describe('Helpers', function () {
    beforeEach(function () {
        helpers = rewire('../../server/helpers');
        helpers.loadCoreHelpers();
    });

    describe('helperMissing', function () {
        it('should not throw an error', function () {
            var helperMissing = helpers.__get__('coreHelpers.helperMissing');

            should.exist(helperMissing);

            function runHelper() {
                var args = arguments;
                return function () {
                    helperMissing.apply(null, args);
                };
            }

            runHelper('test helper').should.not.throwError();
            runHelper('test helper', 'second argument').should.not.throwError();
        });
    });
});
