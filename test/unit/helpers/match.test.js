const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const helpers = require('../../../core/frontend/helpers');
const labs = require('../../../core/shared/labs');
const handlebars = require('../../../core/frontend/services/theme-engine/engine').handlebars;

describe('Match helper', function () {
    before(function () {
        handlebars.registerHelper('match', helpers.match);
    });

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        sinon.stub(labs, 'isSet').returns(true);
    });

    function shouldCompileToExpected(templateString, hash, expected) {
        const template = handlebars.compile(templateString);
        const result = template(hash);

        result.should.eql(expected);
    }

    /**
     * Run tests takes a list of tests & a data hash in the form of two objects
     * The key is the template string, the value is the expected value when the template is compiled with the given hash object
     *
     * @param {object} tests
     * @param {object} hash
     */
    function runTests(tests, hash) {
        _.each(tests, (expectedString, templateString) => {
            it(`${templateString} resolves to '${expectedString}'`, function () {
                shouldCompileToExpected(templateString, hash, expectedString);
            });
        });
    }

    // The match helper, by default, is an inline helper that returns either true or false (as a string) for any given set of arguments.
    // In the first instance, the unit tests should check various combinations of arguments to ensure we get the right answer
    describe('{{match}} (inline)', function () {
        const hash = {
            truthy_bool: true,
            falsy_bool: false,
            zero: 0,
            one: 1,
            string: 'Hello world',
            five: 5,
            string_five: '5',
            empty: '',
            null: null,
            object: {
                foo: 'foo',
                bar: 'bar'
            }
        };

        // @TODO: Fix this!
        describe('Basic values', function () {
            runTests({
                '{{match truthy_bool}}': 'true',
                '{{match falsy_bool}}': 'false',
                '{{match one}}': 'true',
                '{{match zero}}': 'false',
                '{{match string}}': 'true',
                '{{match empty}}': 'false',
                '{{match null}}': 'false',
                '{{match undefined}}': 'false',
                '{{match unknown}}': 'false',
                '{{match object}}': 'true',

                // Zero works if includeZero is set
                '{{match zero includeZero=true}}': 'true',

                // Nesting the helper should still resolve correctly
                '{{match (match truthy_bool)}}': 'true',
                '{{match (match falsy_bool)}}': 'false'
            }, hash);
        });

        // @TODO: Implement Implicit Equals
        // describe('Implicit Equals', function () {
        // runTests({
        // '{{match string "Hello world"}}': 'true',
        // '{{match string "Hello world!"}}': 'false',
        // }, hash);
        // });

        describe('Explicit Equals', function () {
            runTests({
                '{{match string "=" "Hello world"}}': 'true',
                '{{match string "=" "Hello world!"}}': 'false',
                '{{match truthy_bool "=" true}}': 'true',
                '{{match truthy_bool "=" false}}': 'false',
                '{{match falsy_bool "=" false}}': 'true',
                '{{match falsy_bool "=" true}}': 'false',
                '{{match one "=" 1}}': 'true',
                '{{match one "=" "1"}}': 'false',
                '{{match zero "=" 0}}': 'true',
                '{{match zero "=" "0"}}': 'false'
            }, hash);
        });

        describe('Explicit Not Equals', function () {
            runTests({
                '{{match string "!=" "Hello world"}}': 'false',
                '{{match string "!=" "Hello world!"}}': 'true',
                '{{match truthy_bool "!=" true}}': 'false',
                '{{match truthy_bool "!=" false}}': 'true',
                '{{match falsy_bool "!=" false}}': 'false',
                '{{match falsy_bool "!=" true}}': 'true',
                '{{match one "!=" 1}}': 'false',
                '{{match one "!=" "1"}}': 'true',
                '{{match zero "!=" 0}}': 'false',
                '{{match zero "!=" "0"}}': 'true'
            }, hash);
        });
    });

    // By using match as a block helper, instead of returning true or false, the matching template is executed
    // We've already tested all the logic of the matches, for the block helpers we only need to test that the correct template is executed
    // These tests are more explicit so it's clear what functionality we're trying to test
    describe('{{#match}} (block)', function () {
        const templateString = '{{#match title "=" "Hello World"}}case a{{else match title "=" "Hello World!"}}case b{{else}}case c{{/match}}';

        it('Executes the first block when match is true', function () {
            const title = 'Hello World';
            const expected = 'case a';

            shouldCompileToExpected(templateString, {title}, expected);
        });

        it('Executes secondary blocks correctly', function () {
            const title = 'Hello World!';
            const expected = 'case b';

            shouldCompileToExpected(templateString, {title}, expected);
        });

        it('Executes the else block when match is false', function () {
            const title = 'Hello';
            const expected = 'case c';

            shouldCompileToExpected(templateString, {title}, expected);
        });
    });

    // By using match as a block helper, instead of returning true or false, the matching template is executed
    // We've already tested all the logic of the matches, for the block helpers we only need to test that the correct template is executed
    describe('{{#match}} (block)', function () {
        it('Executes the first block when match is true', function () {
            const templateString = '{{#match title "=" "Hello World"}}case a{{else match title "=" "Hello World!"}}case b{{else}}case c{{/match}}';
            const hash = {
                title: 'Hello World'
            };

            const expected = 'case a';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('Executes secondary blocks correctly', function () {
            const templateString = '{{#match title "=" "Hello World"}}case a{{else match title "=" "Hello World!"}}case b{{else}}case c{{/match}}';
            const hash = {
                title: 'Hello World!'
            };

            const expected = 'case b';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('Executes the else block when match is false', function () {
            const templateString = '{{#match title "=" "Hello World"}}case a{{else match title "=" "Hello World!"}}case b{{else}}case c{{/match}}';
            const hash = {
                title: 'Hello'
            };

            const expected = 'case c';

            shouldCompileToExpected(templateString, hash, expected);
        });
    });
});
