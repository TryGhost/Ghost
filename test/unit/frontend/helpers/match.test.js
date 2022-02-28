const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const matchHelper = require('../../../../core/frontend/helpers/match');
const titleHelper = require('../../../../core/frontend/helpers/title');
const labs = require('../../../../core/shared/labs');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;
const {SafeString} = require('express-hbs');

describe('Match helper', function () {
    before(function () {
        handlebars.registerHelper('match', matchHelper);
        handlebars.registerHelper('title', titleHelper);
    });

    afterEach(function () {
        sinon.restore();
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
            title: 'The Title',
            string_true: 'true',
            string_false: 'false',
            safestring_string_true: new SafeString('true'),
            safestring_string_false: new SafeString('false'),
            safestring_bool_true: new SafeString(true),
            safestring_bool_false: new SafeString(false),
            five: 5,
            string_five: '5',
            empty: '',
            null: null,
            object: {
                foo: 'foo',
                bar: 'bar'
            },
            array: ['foo', 'bar']
        };

        describe('Basic values', function () {
            runTests({
                '{{match truthy_bool}}': 'true',
                '{{match falsy_bool}}': 'false',
                '{{match one}}': 'true',
                '{{match zero}}': 'false',
                '{{match string}}': 'true',
                '{{match string_true}}': 'true',
                '{{match string_false}}': 'true',
                '{{match safestring_string_true}}': 'true',
                '{{match safestring_string_false}}': 'true',
                '{{match safestring_bool_true}}': 'true',
                '{{match safestring_bool_false}}': 'false',
                '{{match empty}}': 'false',
                '{{match null}}': 'false',
                '{{match undefined}}': 'false',
                '{{match unknown}}': 'false',
                '{{match object}}': 'true',
                '{{match array}}': 'true',

                '{{match (title)}}': 'true',

                // Zero works if includeZero is set
                '{{match zero includeZero=true}}': 'true',

                // Nesting the helper should still resolve correctly
                '{{match (match truthy_bool)}}': 'true',
                '{{match (match falsy_bool)}}': 'false'
            }, hash);
        });

        // @TODO: Implement Implicit Equals
        describe('Implicit Equals', function () {
            runTests({
                '{{match string "Hello world"}}': 'true',
                '{{match string "Hello world!"}}': 'false',
                '{{match string_true "true"}}': 'true',
                '{{match string_true true}}': 'false',
                '{{match string_false "false"}}': 'true',
                '{{match string_false false}}': 'false',
                '{{match safestring_string_true "true"}}': 'true',
                '{{match safestring_string_true true}}': 'false',
                '{{match safestring_string_false "false"}}': 'true',
                '{{match safestring_string_false false}}': 'false',
                '{{match safestring_bool_true "true"}}': 'false',
                '{{match safestring_bool_true true}}': 'true',
                '{{match safestring_bool_false "false"}}': 'false',
                '{{match safestring_bool_false false}}': 'true',
                '{{match truthy_bool true}}': 'true',
                '{{match truthy_bool false}}': 'false',
                '{{match falsy_bool false}}': 'true',
                '{{match falsy_bool true}}': 'false',
                '{{match one 1}}': 'true',
                '{{match one "1"}}': 'false',
                '{{match zero 0}}': 'true',
                '{{match zero "0"}}': 'false',

                '{{match (title) "The Title"}}': 'true',
                '{{match (title) "The Title!"}}': 'false',

                '{{match object "foo"}}': 'false',
                '{{match object.foo "foo"}}': 'true',
                '{{match array "foo"}}': 'false',
                '{{match array.[0] "foo"}}': 'true'

            }, hash);
        });

        describe('Explicit Equals', function () {
            runTests({
                '{{match string "=" "Hello world"}}': 'true',
                '{{match string "=" "Hello world!"}}': 'false',
                '{{match string_true "=" "true"}}': 'true',
                '{{match string_true "=" true}}': 'false',
                '{{match string_false "=" "false"}}': 'true',
                '{{match string_false "=" false}}': 'false',
                '{{match safestring_string_true "=" "true"}}': 'true',
                '{{match safestring_string_true "=" true}}': 'false',
                '{{match safestring_string_false "=" "false"}}': 'true',
                '{{match safestring_string_false "=" false}}': 'false',
                '{{match safestring_bool_true "=" "true"}}': 'false',
                '{{match safestring_bool_true "=" true}}': 'true',
                '{{match safestring_bool_false "=" "false"}}': 'false',
                '{{match safestring_bool_false "=" false}}': 'true',
                '{{match truthy_bool "=" true}}': 'true',
                '{{match truthy_bool "=" false}}': 'false',
                '{{match falsy_bool "=" false}}': 'true',
                '{{match falsy_bool "=" true}}': 'false',
                '{{match one "=" 1}}': 'true',
                '{{match one "=" "1"}}': 'false',
                '{{match zero "=" 0}}': 'true',
                '{{match zero "=" "0"}}': 'false',

                '{{match (title) "=" "The Title"}}': 'true',
                '{{match (title) "=" "The Title!"}}': 'false',

                '{{match object "=" "foo"}}': 'false',
                '{{match object.foo "=" "foo"}}': 'true',
                '{{match array "=" "foo"}}': 'false',
                '{{match array.[0] "=" "foo"}}': 'true'
            }, hash);
        });

        describe('Explicit Not Equals', function () {
            runTests({
                '{{match string "!=" "Hello world"}}': 'false',
                '{{match string "!=" "Hello world!"}}': 'true',
                '{{match string_true "!=" true}}': 'true',
                '{{match string_true "!=" "true"}}': 'false',
                '{{match string_false "!=" false}}': 'true',
                '{{match string_false "!=" "false"}}': 'false',
                '{{match safestring_string_true "!=" "true"}}': 'false',
                '{{match safestring_string_true "!=" true}}': 'true',
                '{{match safestring_string_false "!=" "false"}}': 'false',
                '{{match safestring_string_false "!=" false}}': 'true',
                '{{match safestring_bool_true "!=" "true"}}': 'true',
                '{{match safestring_bool_true "!=" true}}': 'false',
                '{{match safestring_bool_false "!=" "false"}}': 'true',
                '{{match safestring_bool_false "!=" false}}': 'false',
                '{{match truthy_bool "!=" true}}': 'false',
                '{{match truthy_bool "!=" false}}': 'true',
                '{{match falsy_bool "!=" false}}': 'false',
                '{{match falsy_bool "!=" true}}': 'true',
                '{{match one "!=" 1}}': 'false',
                '{{match one "!=" "1"}}': 'true',
                '{{match zero "!=" 0}}': 'false',
                '{{match zero "!=" "0"}}': 'true',

                '{{match (title) "!=" "The Title"}}': 'false',
                '{{match (title) "!=" "The Title!"}}': 'true',

                '{{match object "!=" "foo"}}': 'true',
                '{{match object.foo "!=" "foo"}}': 'false',
                '{{match array "!=" "foo"}}': 'true',
                '{{match array.[0] "!=" "foo"}}': 'false'
            }, hash);
        });

        describe('Explicit Greater Than', function () {
            runTests({
                // Number to Number comparisons
                '{{match zero ">" 1}}': 'false',
                '{{match one ">" 0}}': 'true',
                '{{match zero ">" 0}}': 'false'
            }, hash);
        });

        describe('Explicit Less Than', function () {
            runTests({
                // Number to Number comparisons
                '{{match zero "<" 1}}': 'true',
                '{{match one "<" 0}}': 'false',
                '{{match zero "<" 0}}': 'false'
            }, hash);
        });

        describe('Explicit Greater Than Or Equal To', function () {
            runTests({
                // Number to Number comparisons
                '{{match zero ">=" 1}}': 'false',
                '{{match one ">=" 0}}': 'true',
                '{{match zero ">=" 0}}': 'true',

                // String to String comparisons
                '{{match string ">=" "Hello world"}}': 'true',
                '{{match "b" ">=" "a"}}': 'true',
                '{{match "b" ">=" "b"}}': 'true',
                '{{match "a" ">=" "b"}}': 'false',
                '{{match "a" ">=" "3"}}': 'true',

                // String to Number comparisons
                '{{match "5" ">=" 3}}': 'true',
                '{{match "3" ">=" 3}}': 'true',
                '{{match "3" ">=" 5}}': 'false',

                '{{match "hello" ">=" 5}}': 'false',
                '{{match 5 ">=" "hello"}}': 'false'
            }, hash);
        });

        describe('Explicit Less Than Or Equal To', function () {
            runTests({
                // Number to Number comparisons
                '{{match zero "<=" 1}}': 'true',
                '{{match one "<=" 0}}': 'false',
                '{{match zero "<=" 0}}': 'true'
            }, hash);
        });

        // SafeStrings represent the original value as an object for example:
        // SafeString { string: true } vs SafeString { string: 'true' }
        // allows us to know if the original value was a boolean or a string
        // These tests make sure that we can compare to the _originaL_ value
        // But that we don't start allowing weird things like boolean true being equal to string true
        describe('SafeString behaviour makes sense(ish)', function () {
            runTests({
                // Title equals true value = true
                '{{match (match title "=" "The Title") "=" "true"}}': 'false',
                '{{match (match title "=" "The Title") "=" true}}': 'true',
                '{{match (match title "=" "The Title")}}': 'true',
                // With title as a helper that also outputs a SafeString
                '{{match (match (title) "=" "The Title") "=" "true"}}': 'false',
                '{{match (match (title) "=" "The Title") "=" true}}': 'true',
                '{{match (match (title) "=" "The Title")}}': 'true',

                // Title equals false value = true
                '{{match (match title "=" "The Title!") "=" "false"}}': 'false',
                '{{match (match title "=" "The Title!") "=" false}}': 'true',
                '{{match (match title "=" "The Title!")}}': 'false',
                // With title as a helper that also outputs a SafeString
                '{{match (match (title) "=" "The Title!") "=" "false"}}': 'false',
                '{{match (match (title) "=" "The Title!") "=" false}}': 'true',
                '{{match (match (title) "=" "The Title!")}}': 'false',

                // // Reverse, reverse!
                // // Title not equals true value = false
                '{{match (match title "!=" "The Title") "=" "false"}}': 'false',
                '{{match (match title "!=" "The Title") "=" false}}': 'true',
                '{{match (match title "!=" "The Title")}}': 'false',
                // With title as a helper that also outputs a SafeString
                '{{match (match (title) "!=" "The Title") "=" "false"}}': 'false',
                '{{match (match (title) "!=" "The Title") "=" false}}': 'true',
                '{{match (match (title) "!=" "The Title")}}': 'false',

                // Yoda a complex example or two to prove this works
                '{{match false "=" (match title "!=" "The Title")}}': 'true',
                '{{match  "false" "=" (match (title) "!=" "The Title")}}': 'false'
            }, {title: 'The Title'});
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
});
