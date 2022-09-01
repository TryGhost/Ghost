const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const foreach = require('../../../../core/frontend/helpers/foreach');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

describe('{{#foreach}} helper', function () {
    let options;
    let context;
    let _this;
    let resultData;

    afterEach(function () {
        sinon.restore();
    });

    describe('(function call)', function () {
        beforeEach(function () {
            context = [];
            _this = {};
            resultData = [];

            function fn(input, data) {
                resultData.push(_.cloneDeep(data));
            }

            options = {
                fn: sinon.spy(fn),
                inverse: sinon.spy(),
                data: {}
            };
        });

        function runTest(self, _context, _options) {
            foreach.call(self, _context, _options);
        }

        it('should not populate data if no private data is supplied (array)', function () {
            delete options.data;
            options.hash = {
                columns: 0
            };

            // test with context as an array
            context = 'hello world this is ghost'.split(' ');

            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).be.undefined();
            });
        });

        it('should not populate data if no private data is supplied (object)', function () {
            delete options.data;
            options.hash = {
                columns: 0
            };

            context = {
                one: 'hello',
                two: 'world',
                three: 'this',
                four: 'is',
                five: 'ghost'
            };

            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).be.undefined();
            });
        });

        it('should populate data when private data is supplied (array)', function () {
            const expected = [
                {first: true, last: false, even: false, odd: true, rowStart: false, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: false},
                {first: false, last: false, even: false, odd: true, rowStart: false, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: false},
                {first: false, last: true, even: false, odd: true, rowStart: false, rowEnd: false}
            ];

            options.hash = {
                columns: 0
            };

            context = 'hello world this is ghost'.split(' ');

            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).not.be.undefined();

                // Expected properties
                resultData[index].data.should.containEql(expected[index]);

                // Incrementing properties
                resultData[index].data.should.have.property('key', index);
                resultData[index].data.should.have.property('index', index);
                resultData[index].data.should.have.property('number', index + 1);
            });

            resultData[_.size(context) - 1].data.should.eql(options.fn.lastCall.args[1].data);
        });

        it('should populate data when private data is supplied (object)', function () {
            const expected = [
                {first: true, last: false, even: false, odd: true, rowStart: false, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: false},
                {first: false, last: false, even: false, odd: true, rowStart: false, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: false},
                {first: false, last: true, even: false, odd: true, rowStart: false, rowEnd: false}
            ];

            options.hash = {
                columns: 0
            };

            context = {
                one: 'hello',
                two: 'world',
                three: 'this',
                four: 'is',
                five: 'ghost'
            };

            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).not.be.undefined();

                // Expected properties
                resultData[index].data.should.containEql(expected[index]);

                // Incrementing properties
                resultData[index].data.should.have.property('key', value);
                resultData[index].data.should.have.property('index', index);
                resultData[index].data.should.have.property('number', index + 1);
            });

            resultData[_.size(context) - 1].data.should.eql(options.fn.lastCall.args[1].data);
        });

        it('should handle rowStart and rowEnd for multiple columns (array)', function () {
            const expected = [
                {first: true, last: false, even: false, odd: true, rowStart: true, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: true},
                {first: false, last: false, even: false, odd: true, rowStart: true, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: true},
                {first: false, last: true, even: false, odd: true, rowStart: true, rowEnd: false}
            ];
            options.hash = {
                columns: 2
            };

            // test with context as an array
            context = 'hello world this is ghost'.split(' ');
            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).not.be.undefined();

                // Expected properties
                resultData[index].data.should.containEql(expected[index]);

                // Incrementing properties
                resultData[index].data.should.have.property('key', index);
                resultData[index].data.should.have.property('index', index);
                resultData[index].data.should.have.property('number', index + 1);
            });

            resultData[_.size(context) - 1].data.should.eql(options.fn.lastCall.args[1].data);
        });

        it('should handle rowStart and rowEnd for multiple columns (array)', function () {
            const expected = [
                {first: true, last: false, even: false, odd: true, rowStart: true, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: true},
                {first: false, last: false, even: false, odd: true, rowStart: true, rowEnd: false},
                {first: false, last: false, even: true, odd: false, rowStart: false, rowEnd: true},
                {first: false, last: true, even: false, odd: true, rowStart: true, rowEnd: false}
            ];
            options.hash = {
                columns: 2
            };

            // test with context as an object
            context = {
                one: 'hello',
                two: 'world',
                three: 'this',
                four: 'is',
                five: 'ghost'
            };

            runTest(_this, context, options);

            options.fn.called.should.be.true();
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).not.be.undefined();

                // Expected properties
                resultData[index].data.should.containEql(expected[index]);

                // Incrementing properties
                resultData[index].data.should.have.property('key', value);
                resultData[index].data.should.have.property('index', index);
                resultData[index].data.should.have.property('number', index + 1);
            });

            resultData[_.size(context) - 1].data.should.eql(options.fn.lastCall.args[1].data);
        });

        it('should return the correct inverse result if no context is provided', function () {
            _this = 'the inverse data';
            options.hash = {
                columns: 0
            };

            runTest(_this, context, options);

            options.fn.called.should.be.false();
            options.inverse.called.should.be.true();
            options.inverse.calledOnce.should.be.true();
        });
    });

    describe('(compile)', function () {
        const objectHash = {
            posts: {
                first: {title: 'first'},
                second: {title: 'second'},
                third: {title: 'third'},
                fourth: {title: 'fourth'},
                fifth: {title: 'fifth'}
            }
        };

        const objectHashWithVis = {
            posts: {
                first: {title: 'first', visibility: 'members', slug: 'first', html: ''},
                second: {title: 'second'},
                third: {title: 'third'},
                fourth: {title: 'fourth'},
                fifth: {title: 'fifth'}
            }
        };

        const arrayHash = {
            posts: [
                {title: 'first'}, {title: 'second'}, {title: 'third'}, {title: 'fourth'}, {title: 'fifth'}
            ]
        };

        const arrayHashWithVis = {
            posts: [
                {title: 'first', visibility: 'members', slug: 'first', html: ''}, {title: 'second'}, {title: 'third'}, {title: 'fourth'}, {title: 'fifth'}
            ]
        };

        const arrayHash2 = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'};

        const objectHash2 = {
            goodbyes: {foo: {text: 'goodbye'}, bar: {text: 'Goodbye'}, baz: {text: 'GOODBYE'}},
            world: 'world'
        };

        function shouldCompileToExpected(templateString, hash, expected) {
            const template = handlebars.compile(templateString);
            const result = template(hash);

            result.should.eql(expected);
        }

        before(function () {
            handlebars.registerHelper('foreach', foreach);
        });

        /** Many of these are copied direct from the handlebars spec */
        it('object and @key', function () {
            const templateString = '<ul>{{#foreach posts}}<li>{{@key}} {{title}}</li>{{/foreach}}</ul>';
            const expected = '<ul><li>first first</li><li>second second</li><li>third third</li><li>fourth fourth</li><li>fifth fifth</li></ul>';

            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@index', function () {
            const templateString = '<ul>{{#foreach posts}}<li>{{@index}} {{title}}</li>{{/foreach}}</ul>';
            const expected = '<ul><li>0 first</li><li>1 second</li><li>2 third</li><li>3 fourth</li><li>4 fifth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@number', function () {
            const templateString = '<ul>{{#foreach posts}}<li>{{@number}} {{title}}</li>{{/foreach}}</ul>';
            const expected = '<ul><li>1 first</li><li>2 second</li><li>3 third</li><li>4 fourth</li><li>5 fifth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('nested @index', function () {
            const templateString = '{{#foreach goodbyes}}{{@index}}. {{text}}! {{#foreach ../goodbyes}}{{@index}} {{/foreach}}After {{@index}} {{/foreach}}{{@index}}cruel {{world}}!';
            const expected = '0. goodbye! 0 1 2 After 0 1. Goodbye! 0 1 2 After 1 2. GOODBYE! 0 1 2 After 2 cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('array block params', function () {
            const templateString = '{{#foreach goodbyes as |value index|}}{{index}}. {{value.text}}! {{#foreach ../goodbyes as |childValue childIndex|}} {{index}} {{childIndex}}{{/foreach}} After {{index}} {{/foreach}}{{index}}cruel {{world}}!';
            const expected = '0. goodbye!  0 0 0 1 0 2 After 0 1. Goodbye!  1 0 1 1 1 2 After 1 2. GOODBYE!  2 0 2 1 2 2 After 2 cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
        });

        it('object block params', function () {
            const templateString = '{{#foreach goodbyes as |value index|}}{{index}}. {{value.text}}! {{#foreach ../goodbyes as |childValue childIndex|}} {{index}} {{childIndex}}{{/foreach}} After {{index}} {{/foreach}}{{index}}cruel {{world}}!';
            const expected = 'foo. goodbye!  foo foo foo bar foo baz After foo bar. Goodbye!  bar foo bar bar bar baz After bar baz. GOODBYE!  baz foo baz bar baz baz After baz cruel world!';

            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('@first', function () {
            const templateString = '{{#foreach goodbyes}}{{#if @first}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!';
            const expected = 'goodbye! cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('nested @first', function () {
            const templateString = '{{#foreach goodbyes}}({{#if @first}}{{text}}! {{/if}}{{#foreach ../goodbyes}}{{#if @first}}{{text}}!{{/if}}{{/foreach}}{{#if @first}} {{text}}!{{/if}}) {{/foreach}}cruel {{world}}!';
            const expected = '(goodbye! goodbye! goodbye!) (goodbye!) (goodbye!) cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('@last', function () {
            const templateString = '{{#foreach goodbyes}}{{#if @last}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!';
            const expected = 'GOODBYE! cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('nested @last', function () {
            const templateString = '{{#foreach goodbyes}}({{#if @last}}{{text}}! {{/if}}{{#foreach ../goodbyes}}{{#if @last}}{{text}}!{{/if}}{{/foreach}}{{#if @last}} {{text}}!{{/if}}) {{/foreach}}cruel {{world}}!';
            const expected = '(GOODBYE!) (GOODBYE!) (GOODBYE! GOODBYE! GOODBYE!) cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('@last in foreach with limit', function () {
            const templateString = '{{#foreach goodbyes limit="2"}}{{#if @last}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!';
            const expected = 'Goodbye! cruel world!';

            shouldCompileToExpected(templateString, arrayHash2, expected);
            shouldCompileToExpected(templateString, objectHash2, expected);
        });

        it('foreach with limit 1', function () {
            const templateString = '<ul>{{#foreach posts limit="1"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>first</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with limit 3', function () {
            const templateString = '<ul>{{#foreach posts limit="3"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>first</li><li>second</li><li>third</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with limit 3 and post with members visibility', function () {
            const templateString = '<ul>{{#foreach posts limit="3"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>first</li><li>second</li><li>third</li></ul>';
            shouldCompileToExpected(templateString, arrayHashWithVis, expected);
            shouldCompileToExpected(templateString, objectHashWithVis, expected);
        });

        it('foreach with from 2', function () {
            const templateString = '<ul>{{#foreach posts from="2"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>second</li><li>third</li><li>fourth</li><li>fifth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with to 4', function () {
            const templateString = '<ul>{{#foreach posts to="4"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>first</li><li>second</li><li>third</li><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with from 2 and to 3', function () {
            const templateString = '<ul>{{#foreach posts from="2" to="3"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>second</li><li>third</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with from 3 and limit 2', function () {
            const templateString = '<ul>{{#foreach posts from="3" limit="2"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>third</li><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('foreach with from 2, to 5 and limit 3', function () {
            const templateString = '<ul>{{#foreach posts from="2" to="5" limit="3"}}<li>{{title}}</li>{{else}}not this{{/foreach}}</ul>';
            const expected = '<ul><li>second</li><li>third</li><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@first in foreach with from 2 and to 4', function () {
            const templateString = '<ul>{{#foreach posts from="2" to="4"}}{{#if @first}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>second</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });
        it('@last in foreach with from 2 and to 4', function () {
            const templateString = '<ul>{{#foreach posts from="2" to="4"}}{{#if @last}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@last in foreach with from 4', function () {
            const templateString = '<ul>{{#foreach posts from="4"}}{{#if @last}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fifth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@first in foreach with from 4', function () {
            const templateString = '<ul>{{#foreach posts from="4"}}{{#if @first}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@last in foreach with to 4', function () {
            const templateString = '<ul>{{#foreach posts to="4"}}{{#if @last}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@first in foreach with to 4', function () {
            const templateString = '<ul>{{#foreach posts to="4"}}{{#if @first}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>first</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@last in foreach with from 4 and limit 3', function () {
            const templateString = '<ul>{{#foreach posts from="4" limit="3"}}{{#if @last}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fifth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@first in foreach with from 4 and limit 3', function () {
            const templateString = '<ul>{{#foreach posts from="4" limit="3"}}{{#if @first}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>fourth</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@last in foreach with to 4 and limit 3', function () {
            const templateString = '<ul>{{#foreach posts to="4" limit="3"}}{{#if @last}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>third</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        it('@first in foreach with to 4 and limit 3', function () {
            const templateString = '<ul>{{#foreach posts to="4" limit="3"}}{{#if @first}}<li>{{title}}</li>{{/if}}{{/foreach}}</ul>';
            const expected = '<ul><li>first</li></ul>';

            shouldCompileToExpected(templateString, arrayHash, expected);
            shouldCompileToExpected(templateString, objectHash, expected);
        });

        describe('Internal Tags', function () {
            const tagArrayHash = {
                tags: [
                    {name: 'first', visibility: 'public'},
                    {name: 'second', visibility: 'public'},
                    {name: 'third', visibility: 'internal'},
                    {name: 'fourth', visibility: 'public'},
                    {name: 'fifth', visibility: 'public'}
                ]
            };

            const tagObjectHash = {
                tags: {
                    first: {name: 'first', visibility: 'public'},
                    second: {name: 'second', visibility: 'public'},
                    third: {name: 'third', visibility: 'internal'},
                    fourth: {name: 'fourth', visibility: 'public'},
                    fifth: {name: 'fifth', visibility: 'public'}
                }
            };

            it('will not output internal tags', function () {
                const templateString = '<ul>{{#foreach tags}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul><li>0 first</li><li>1 second</li><li>2 fourth</li><li>3 fifth</li></ul>';

                shouldCompileToExpected(templateString, tagObjectHash, expected);
                shouldCompileToExpected(templateString, tagArrayHash, expected);
            });

            it('should still correctly apply from & limit tags', function () {
                const templateString = '<ul>{{#foreach tags from="2" limit="2"}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul><li>1 second</li><li>2 fourth</li></ul>';

                shouldCompileToExpected(templateString, tagObjectHash, expected);
                shouldCompileToExpected(templateString, tagArrayHash, expected);
            });

            it('should output all tags with visibility="all"', function () {
                const templateString = '<ul>{{#foreach tags visibility="all"}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul><li>0 first</li><li>1 second</li><li>2 third</li><li>3 fourth</li><li>4 fifth</li></ul>';

                shouldCompileToExpected(templateString, tagObjectHash, expected);
                shouldCompileToExpected(templateString, tagArrayHash, expected);
            });

            it('should output all tags with visibility property set with visibility="public,internal"', function () {
                const templateString = '<ul>{{#foreach tags visibility="public,internal"}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul><li>0 first</li><li>1 second</li><li>2 third</li><li>3 fourth</li><li>4 fifth</li></ul>';

                shouldCompileToExpected(templateString, tagObjectHash, expected);
                shouldCompileToExpected(templateString, tagArrayHash, expected);
            });

            it('should output all tags with visibility="internal"', function () {
                const templateString = '<ul>{{#foreach tags visibility="internal"}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul><li>0 third</li></ul>';

                shouldCompileToExpected(templateString, tagObjectHash, expected);
                shouldCompileToExpected(templateString, tagArrayHash, expected);
            });

            it('should output nothing if all tags are internal', function () {
                const internalTagArrayHash = {
                    tags: [
                        {name: 'first', visibility: 'internal'},
                        {name: 'second', visibility: 'internal'}
                    ]
                };

                const internalTagObjectHash = {
                    tags: {
                        first: {name: 'first', visibility: 'internal'},
                        second: {name: 'second', visibility: 'internal'}
                    }
                };

                const templateString = '<ul>{{#foreach tags}}<li>{{@index}} {{name}}</li>{{/foreach}}</ul>';
                const expected = '<ul></ul>';

                shouldCompileToExpected(templateString, internalTagObjectHash, expected);
                shouldCompileToExpected(templateString, internalTagArrayHash, expected);
            });
        });
    });
});
