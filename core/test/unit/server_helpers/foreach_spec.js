/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    _              = require('lodash'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{#foreach}} helper', function () {
    var options, context, _this, resultData, sandbox = sinon.sandbox.create();

    before(function () {
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
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
                fn: sandbox.spy(fn),
                inverse: sandbox.spy(),
                data: {}
            };
        });

        function runTest(self, context, options) {
            helpers.foreach.call(self, context, options);
        }

        it('is loaded', function () {
            should.exist(handlebars.helpers.foreach);
        });

        it('should not populate data if no private data is supplied (array)', function () {
            delete options.data;
            options.hash = {
                columns: 0
            };

            // test with context as an array
            context = 'hello world this is ghost'.split(' ');

            runTest(_this, context, options);

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).be.undefined;
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

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).be.undefined;
            });
        });

        it('should populate data when private data is supplied (array)', function () {
            var expected = [
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

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).not.be.undefined;

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
            var expected = [
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

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).not.be.undefined;

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
            var expected = [
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

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(context, function (value, index) {
                options.fn.getCall(index).args[0].should.eql(value);
                should(options.fn.getCall(index).args[1].data).not.be.undefined;

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
            var expected = [
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

            options.fn.called.should.be.true;
            options.fn.getCalls().length.should.eql(_.size(context));

            _.each(_.keys(context), function (value, index) {
                options.fn.getCall(index).args[0].should.eql(context[value]);
                should(options.fn.getCall(index).args[1].data).not.be.undefined;

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

            options.fn.called.should.be.false;
            options.inverse.called.should.be.true;
            options.inverse.calledOnce.should.be.true;
        });
    });

    describe('(compile)', function () {
        function shouldCompileToExpected(templateString, hash, expected) {
            var template = handlebars.compile(templateString),
                result = template(hash);

            result.should.eql(expected);
        }

        /** Many of these are copied direct from the handlebars spec */
        it('foreach with object and @key', function () {
            var templateString = '<ul>{{#foreach posts}}<li>{{@key}} {{title}}</li>{{/foreach}}</ul>',
                hash = {posts: {first: {title: 'first'}, second: {title: 'second'}}},
                expected = '<ul><li>first first</li><li>second second</li></ul>';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with @index', function () {
            var templateString = '<ul>{{#foreach posts}}<li>{{@index}} {{title}}</li>{{/foreach}}</ul>',
                hash = {posts: [{title: 'first'}, {title: 'second'}]},
                expected = '<ul><li>0 first</li><li>1 second</li></ul>';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with @number', function () {
            var templateString = '<ul>{{#foreach posts}}<li>{{@number}} {{title}}</li>{{/foreach}}</ul>',
                hash = {posts: [{title: 'first'}, {title: 'second'}]},
                expected = '<ul><li>1 first</li><li>2 second</li></ul>';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with nested @index', function () {
            var templateString = '{{#foreach goodbyes}}{{@index}}. {{text}}! {{#foreach ../goodbyes}}{{@index}} {{/foreach}}After {{@index}} {{/foreach}}{{@index}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'},
                expected = '0. goodbye! 0 1 2 After 0 1. Goodbye! 0 1 2 After 1 2. GOODBYE! 0 1 2 After 2 cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with block params', function () {
            var templateString = '{{#foreach goodbyes as |value index|}}{{index}}. {{value.text}}! {{#foreach ../goodbyes as |childValue childIndex|}} {{index}} {{childIndex}}{{/foreach}} After {{index}} {{/foreach}}{{index}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}], world: 'world'},
                expected = '0. goodbye!  0 0 0 1 After 0 1. Goodbye!  1 0 1 1 After 1 cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with @first', function () {
            var templateString = '{{#foreach goodbyes}}{{#if @first}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'},
                expected = 'goodbye! cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with nested @first', function () {
            var templateString = '{{#foreach goodbyes}}({{#if @first}}{{text}}! {{/if}}{{#foreach ../goodbyes}}{{#if @first}}{{text}}!{{/if}}{{/foreach}}{{#if @first}} {{text}}!{{/if}}) {{/foreach}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'},
                expected = '(goodbye! goodbye! goodbye!) (goodbye!) (goodbye!) cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach object with @first', function () {
            var templateString = '{{#foreach goodbyes}}{{#if @first}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!',
                hash = {goodbyes: {foo: {text: 'goodbye'}, bar: {text: 'Goodbye'}}, world: 'world'},
                expected = 'goodbye! cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with @last', function () {
            var templateString = '{{#foreach goodbyes}}{{#if @last}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'},
                expected = 'GOODBYE! cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach object with @last', function () {
            var templateString = '{{#foreach goodbyes}}{{#if @last}}{{text}}! {{/if}}{{/foreach}}cruel {{world}}!',
                hash = {goodbyes: {foo: {text: 'goodbye'}, bar: {text: 'Goodbye'}}, world: 'world'},
                expected = 'Goodbye! cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('foreach with nested @last', function () {
            var templateString = '{{#foreach goodbyes}}({{#if @last}}{{text}}! {{/if}}{{#foreach ../goodbyes}}{{#if @last}}{{text}}!{{/if}}{{/foreach}}{{#if @last}} {{text}}!{{/if}}) {{/foreach}}cruel {{world}}!',
                hash = {goodbyes: [{text: 'goodbye'}, {text: 'Goodbye'}, {text: 'GOODBYE'}], world: 'world'},
                expected = '(GOODBYE!) (GOODBYE!) (GOODBYE! GOODBYE! GOODBYE!) cruel world!';

            shouldCompileToExpected(templateString, hash, expected);
        });
    });
});
