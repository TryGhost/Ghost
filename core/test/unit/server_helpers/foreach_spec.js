/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{#foreach}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    // passed into the foreach helper.  takes the input string along with the metadata about
    // the current row and builds a csv output string that can be used to check the results.
    function fn(input, data) {
        data = data.data;

        // if there was no private data passed into the helper, no metadata
        // was created, so just return the input
        if (!data) {
            return input + '\n';
        }

        return input + ',' + data.first + ',' + data.rowEnd + ',' + data.rowStart + ',' +
            data.last + ',' + data.even + ',' + data.odd + '\n';
    }

    function inverse(input) {
        return input;
    }

    it('is loaded', function () {
        should.exist(handlebars.helpers.foreach);
    });

    it('should return the correct result when no private data is supplied', function () {
        var options = {},
            context = [],
            _this = {},
            rendered;

        options.fn = fn;
        options.inverse = inverse;
        options.hash = {
            columns: 0
        };

        // test with context as an array

        context = 'hello world this is ghost'.split(' ');

        rendered = helpers.foreach.call(_this, context, options);
        rendered.should.equal('hello\nworld\nthis\nis\nghost\n');

        // test with context as an object

        context = {
            one: 'hello',
            two: 'world',
            three: 'this',
            four: 'is',
            five: 'ghost'
        };

        rendered = helpers.foreach.call(_this, context, options);
        rendered.should.equal('hello\nworld\nthis\nis\nghost\n');
    });

    it('should return the correct result when private data is supplied', function () {
        var options = {},
            context = [],
            _this = {},
            rendered,
            result;

        options.fn = fn;
        options.inverse = inverse;

        options.hash = {
            columns: 0
        };

        options.data = {};

        context = 'hello world this is ghost'.split(' ');

        rendered = helpers.foreach.call(_this, context, options);

        result = rendered.split('\n');
        result[0].should.equal('hello,true,false,false,false,false,true');
        result[1].should.equal('world,false,false,false,false,true,false');
        result[2].should.equal('this,false,false,false,false,false,true');
        result[3].should.equal('is,false,false,false,false,true,false');
        result[4].should.equal('ghost,false,false,false,true,false,true');
    });

    it('should return the correct result when private data is supplied & there are multiple columns', function () {
        var options = {},
            context = [],
            _this = {},
            rendered,
            result;

        options.fn = fn;
        options.inverse = inverse;

        options.hash = {
            columns: 2
        };

        options.data = {};

        // test with context as an array

        context = 'hello world this is ghost'.split(' ');

        rendered = helpers.foreach.call(_this, context, options);

        result = rendered.split('\n');
        result[0].should.equal('hello,true,false,true,false,false,true');
        result[1].should.equal('world,false,true,false,false,true,false');
        result[2].should.equal('this,false,false,true,false,false,true');
        result[3].should.equal('is,false,true,false,false,true,false');
        result[4].should.equal('ghost,false,false,true,true,false,true');

        // test with context as an object

        context = {
            one: 'hello',
            two: 'world',
            three: 'this',
            four: 'is',
            five: 'ghost'
        };

        rendered = helpers.foreach.call(_this, context, options);

        result = rendered.split('\n');
        result[0].should.equal('hello,true,false,true,false,false,true');
        result[1].should.equal('world,false,true,false,false,true,false');
        result[2].should.equal('this,false,false,true,false,false,true');
        result[3].should.equal('is,false,true,false,false,true,false');
        result[4].should.equal('ghost,false,false,true,true,false,true');
    });

    it('should return the correct inverse result if no context is provided', function () {
        var options = {},
            context = [],
            _this = 'the inverse data',
            rendered;

        options.fn = function () {};
        options.inverse = inverse;
        options.hash = {
            columns: 0
        };
        options.data = {};

        rendered = helpers.foreach.call(_this, context, options);
        rendered.should.equal(_this);
    });
});
