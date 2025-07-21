const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const loggingLib = require('@tryghost/logging');

const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');
const {SafeString} = require('express-hbs');

const match = require('../../../../core/frontend/helpers/match');

describe('Match helper', function () {
    let logging;

    before(function () {
        registerHelper('match');
        registerHelper('title');
    });

    beforeEach(function () {
        logging = {
            error: sinon.stub(loggingLib, 'error')
        };
    });    

    afterEach(function () {
        sinon.restore();
    });

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

        describe('Explicit contains', function () {
            runTests({
                // Using string values
                '{{match empty "~" ""}}': 'true',
                '{{match " " "~" empty}}': 'true',
                '{{match empty "~" " "}}': 'false',
                '{{match string "~" "Hello"}}': 'true',
                '{{match string "~" "world"}}': 'true',
                '{{match string "~" "lo wo"}}': 'true',
                '{{match string_true "~" "ru"}}': 'true',
                '{{match string_false "~" "ru"}}': 'false',
                '{{match safestring_string_false "~" "als"}}': 'true',
                '{{match safestring_string_true "~" "als"}}': 'false',
                '{{match string_five "~" "5"}}': 'true',
                '{{match string_five "~" "6"}}': 'false',
                '{{match object.foo "~" "fo"}}': 'true',
                '{{match object.foo "~" "ba"}}': 'false',
                '{{match array.[0] "~" "fo"}}': 'true',
                '{{match array.[0] "~" "ba"}}': 'false',

                // Using non-string values
                '{{match zero "~" 0}}': 'false',
                '{{match zero "~" "0"}}': 'false',
                '{{match "1" "~" one}}': 'false',
                '{{match null "~" "null"}}': 'false',
                '{{match truthy_bool "~" "tr"}}': 'false',
                '{{match safestring_bool_false "~" "fa"}}': 'false',
                '{{match undefined "~" "undefined"}}': 'false',
                '{{match unknown "~" "unknown" }}': 'false',
                '{{match object "~" "object" }}': 'false',
                '{{match array "~" "array" }}': 'false'
            }, hash);
        });

        describe('Explicit Starts With', function () {
            runTests({
                // Using string values
                '{{match empty "~^" ""}}': 'true',
                '{{match empty "~^" " "}}': 'false',
                '{{match string "~^" "Hello"}}': 'true',
                '{{match string "~^" "World"}}': 'false',
                '{{match string_true "~^" "tr"}}': 'true',
                '{{match string_false "~^" "tr"}}': 'false',
                '{{match safestring_string_false "~^" "fa"}}': 'true',
                '{{match safestring_string_true "~^" "fa"}}': 'false',
                '{{match string_five "~^" "5"}}': 'true',
                '{{match string_five "~^" "6"}}': 'false',
                '{{match object.foo "~^" "fo"}}': 'true',
                '{{match object.foo "~^" "ba"}}': 'false',
                '{{match array.[0] "~^" "fo"}}': 'true',
                '{{match array.[0] "~^" "ba"}}': 'false',

                // Using non-string values
                '{{match zero "~^" 0}}': 'false',
                '{{match zero "~^" "0"}}': 'false',
                '{{match "1" "~^" one}}': 'false',
                '{{match null "~^" "null"}}': 'false',
                '{{match truthy_bool "~^" "tr"}}': 'false',
                '{{match safestring_bool_false "~^" "fa"}}': 'false',
                '{{match undefined "~^" "undefined"}}': 'false',
                '{{match unknown "~^" "unknown" }}': 'false',
                '{{match object "~^" "object" }}': 'false',
                '{{match array "~^" "array" }}': 'false'
            }, hash);
        });

        describe('Explicit Ends With', function () {
            runTests({
                // Using string values
                '{{match empty "~$" ""}}': 'true',
                '{{match empty "~$" " "}}': 'false',
                '{{match string "~$" "world"}}': 'true',
                '{{match string "~$" "Hello"}}': 'false',
                '{{match string_true "~$" "ue"}}': 'true',
                '{{match string_false "~$" "ue"}}': 'false',
                '{{match safestring_string_false "~$" "ue"}}': 'false',
                '{{match safestring_string_true "~$" "ue"}}': 'true',
                '{{match string_five "~$" "5"}}': 'true',
                '{{match string_five "~$" "6"}}': 'false',
                '{{match object.foo "~$" "oo"}}': 'true',
                '{{match object.foo "~$" "ba"}}': 'false',
                '{{match array.[0] "~$" "oo"}}': 'true',
                '{{match array.[0] "~$" "ar"}}': 'false',

                // Using non-string values
                '{{match zero "~$" 0}}': 'false',
                '{{match zero "~$" "0"}}': 'false',
                '{{match "1" "~$" one}}': 'false',
                '{{match null "~$" "null"}}': 'false',
                '{{match truthy_bool "~$" "tr"}}': 'false',
                '{{match safestring_bool_false "~$" "fa"}}': 'false',
                '{{match undefined "~$" "undefined"}}': 'false',
                '{{match unknown "~$" "unknown" }}': 'false',
                '{{match object "~$" "object" }}': 'false',
                '{{match array "~$" "array" }}': 'false'
            }, hash);
        });

        // SafeStrings represent the original value as an object for example:
        // SafeString { string: true } vs SafeString { string: 'true' }
        // allows us to know if the original value was a boolean or a string
        // These tests make sure that we can compare to the _originaL_ value
        // But that we don't start allowing weird things like boolean true being equal to string true
        describe('SafeString behavior makes sense(ish)', function () {
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

        describe('NQL', function () {
            describe('Common NQL expressions', function () {
                const context = {
                    post: {
                        slug: 'welcome',
                        id: '5c7ece47da174000c0c5c6d7',
                        title: 'Welcome',
                        html: '<p>Welcome, it\'s great to have you here.</p>',
                        feature_image: null,
                        featured: true,
                        url: 'https://demo.ghost.io/welcome-short/',
                        excerpt: 'Welcome, it\'s great to have you here.',                     
                        authors: [
                            {
                                id: '5951f5fca366002ebd5dbef7',
                                name: 'Ghost',
                                slug: 'ghost'
                            },
                            {
                                id: '6151f5fca366002ebd5dbeb8',
                                name: 'John Doe',
                                slug: 'john-doe'
                            }
                        ],
                        tags: [
                            {
                                id: '59799bbd6ebb2f00243a33db',
                                name: 'Getting Started',
                                slug: 'getting-started'
                            },
                            {
                                id: '69799bbd6ebb2f00243a334e',
                                name: '#Second Tag',
                                slug: 'hash-second-tag'
                            }
                        ],
                        primary_author: {
                            id: '5951f5fca366002ebd5dbef7',
                            name: 'Ghost',
                            slug: 'ghost'
                        },
                        primary_tag: {
                            id: '59799bbd6ebb2f00243a33db',
                            name: 'Getting Started',
                            slug: 'getting-started'
                        }                                 
                    }
                };
            
                runTests({
                    // basic
                    '{{match post "slug:welcome" }}': 'true',
                    '{{match post "slug:incorrect" }}': 'false',
                    '{{match post "featured:true" }}': 'true',
                    '{{match post "featured:false" }}': 'false',
                    '{{match post "feature_image:null" }}': 'true',
                    '{{match post "feature_image:\'null\'" }}': 'false',
                    '{{match post "undefined_prop:null" }}': 'true',
                    '{{match post "url:~^\'https\'" }}': 'true',
                    '{{match post "url:~^\'ftp\'" }}': 'false',
                    '{{match post "url:~\'ghost\'" }}': 'true',
                    '{{match post "url:~\'wp\'" }}': 'false',
                    '{{match post "url:~$\'/\'" }}': 'true',
                    '{{match post "url:~$\'@\'" }}': 'false',
    
                    '{{match post "slug:-welcome" }}': 'false',
                    '{{match post "slug:-incorrect" }}': 'true',
                    '{{match post "featured:-true" }}': 'false',
                    '{{match post "featured:-false" }}': 'true',
                    '{{match post "feature_image:-null" }}': 'false',
                    '{{match post "feature_image:-\'null\'" }}': 'true',
                    '{{match post "undefined_prop:-null" }}': 'false',
                    '{{match post "url:-~^\'https\'" }}': 'false',
                    '{{match post "url:-~^\'ftp\'" }}': 'true',
                    '{{match post "url:-~\'ghost\'" }}': 'false',
                    '{{match post "url:-~\'wp\'" }}': 'true',
                    '{{match post "url:-~$\'/\'" }}': 'false',
                    '{{match post "url:-~$\'@\'" }}': 'true',
    
                    // nested objects
                    '{{match post "primary_tag:getting-started" }}': 'true',
                    '{{match post "primary_tag:incorrect" }}': 'false',
                    '{{match post "primary_tag.slug:getting-started" }}': 'true',
                    '{{match post "primary_tag.slug:incorrect" }}': 'false',
                    '{{match post "primary_tag.name:\'Getting Started\'" }}': 'true',
    
                    '{{match post "primary_author:ghost" }}': 'true',
                    '{{match post "primary_author:incorrect" }}': 'false',
                    '{{match post "primary_author.slug:ghost" }}': 'true',
                    '{{match post "primary_author.slug:incorrect" }}': 'false',
                    '{{match post "primary_author.name:\'Ghost\'" }}': 'true',
    
                    // nested arrays
                    '{{match post "tags:hash-second-tag" }}': 'true',
                    '{{match post "tags:hash-incorrect" }}': 'false',
                    '{{match post "tags.slug:hash-second-tag" }}': 'true',
                    '{{match post "tags.slug:hash-incorrect" }}': 'false',
                    '{{match post "tags.name:\'#Second Tag\'" }}': 'true',
    
                    '{{match post "authors:john-doe" }}': 'true',
                    '{{match post "authors:incorrect" }}': 'false',
                    '{{match post "authors.slug:john-doe" }}': 'true',
                    '{{match post "authors.slug:incorrect" }}': 'false',
                    '{{match post "authors.name:\'John Doe\'" }}': 'true',
    
                    // arrays
                    '{{match post.tags "slug:hash-second-tag" }}': 'true',
                    '{{match post.tags "slug:hash-incorrect" }}': 'false',
                    '{{match post.tags "name:\'#Second Tag\'" }}': 'true',
    
                    '{{match post.authors "slug:john-doe" }}': 'true',
                    '{{match post.authors "slug:incorrect" }}': 'false',
                    '{{match post.authors "name:\'John Doe\'" }}': 'true',
                    
                    // and
                    '{{match post "slug:welcome+tags.name:\'Getting Started\'" }}': 'true',
                    '{{match post "slug:welcome+tags.name:\'Incorrect\'" }}': 'false',
                    '{{match post "slug:incorrect+tags.name:\'Getting Started\'" }}': 'false',
                    '{{match post "slug:incorrect+tags.name:\'Incorrect\'" }}': 'false',
    
                    // or
                    '{{match post "slug:welcome,tags.name:\'Getting Started\'" }}': 'true',
                    '{{match post "slug:welcome,tags.name:\'Incorrect\'" }}': 'true',
                    '{{match post "slug:incorrect,tags.name:\'Getting Started\'" }}': 'true',
                    '{{match post "slug:incorrect,tags.name:\'Incorrect\'" }}': 'false',
                    '{{match post "tags:[getting-started,incorrect]" }}': 'true',
                    '{{match post "tags:[not-getting-started,incorrect]" }}': 'false'
                }, context);
            });

            it('Adds @matches to context when the data is an array and the result is "true"', function () {
                const array = [
                    {
                        id: '59799bbd6ebb2f00243a33db',
                        name: 'Getting Started',
                        slug: 'getting-started'
                    },
                    {
                        id: '69799bbd6ebb2f00243a334e',
                        name: '#Second Tag',
                        slug: 'hash-second-tag'
                    },
                    {
                        id: '69799bbd6ebb2f00243a334e',
                        name: '#Third Tag',
                        slug: 'hash-third-tag'
                    }
                ];         
                
                let resultData = {};

                const options = {
                    fn: sinon.spy((input, data) => {
                        resultData = _.cloneDeep(data);
                    }),
                    data: {},                    
                    hash: {}
                };

                match.call({}, array, 'slug:~^\'hash\'', options);

                options.fn.called.should.be.true();
                resultData.data.should.have.property('matches');
                resultData.data.matches.length.should.eql(2);
                resultData.data.matches[0].should.eql(array[1]);
                resultData.data.matches[1].should.eql(array[2]);
            });

            it('Returns "false" if the NQL expression is invalid', function () {
                const context = {
                    post: {
                        slug: 'welcome',
                        welcome: true
                    }
                };
                const expected = 'false';
                const templateString = '{{match post "welcome" }}';
    
                shouldCompileToExpected(templateString, context, expected);

                logging.error.calledOnce.should.be.true();
            });
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
