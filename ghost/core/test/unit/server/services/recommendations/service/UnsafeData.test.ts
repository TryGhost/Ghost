import assert from 'assert/strict';
import {UnsafeData} from '../../../../../../core/server/services/recommendations/service/UnsafeData';

describe('UnsafeData', function () {
    describe('optionalKey', function () {
        it('Returns data for a valid key', function () {
            const data = new UnsafeData({foo: 'bar'});
            assert.deepEqual(
                data.optionalKey('foo'),
                new UnsafeData('bar', {
                    field: ['foo']
                })
            );
        });

        it('Extends the context fields', function () {
            const data = new UnsafeData({foo: 'bar'}, {field: ['baz']});
            assert.deepEqual(
                data.optionalKey('foo'),
                new UnsafeData('bar', {
                    field: ['baz', 'foo']
                })
            );
        });

        it('Throws for null', function () {
            const data = new UnsafeData(null);
            assert.throws(() => {
                data.optionalKey('foo');
            }, {message: 'data must be an object'});
        });

        it('Throws for non-objects', function () {
            const data = new UnsafeData(15, {field: ['baz']});
            assert.throws(() => {
                data.optionalKey('foo');
            }, {message: 'baz must be an object'});
        });

        it('Returns undefined if the property does not exist', function () {
            const data = new UnsafeData({foo: 'bar'});
            assert.equal(
                data.optionalKey('baz'),
                undefined
            );
        });

        it('Returns undefined if the property was inherited from a parent', function () {
            const data = new UnsafeData(new Date());
            assert.equal(
                data.optionalKey('getTime'),
                undefined
            );
        });
    });

    describe('key', function () {
        it('Returns data for a valid key', function () {
            const data = new UnsafeData({foo: 'bar'});
            assert.deepEqual(
                data.key('foo'),
                new UnsafeData('bar', {
                    field: ['foo']
                })
            );
        });

        it('Extends the context fields', function () {
            const data = new UnsafeData({foo: 'bar'}, {field: ['baz']});
            assert.deepEqual(
                data.key('foo'),
                new UnsafeData('bar', {
                    field: ['baz', 'foo']
                })
            );
        });

        it('Throws for null', function () {
            const data = new UnsafeData(null);
            assert.throws(() => {
                data.key('foo');
            }, {message: 'data must be an object'});
        });

        it('Throws for non-objects', function () {
            const data = new UnsafeData(15, {field: ['baz']});
            assert.throws(() => {
                data.key('foo');
            }, {message: 'baz must be an object'});
        });

        it('Throws if the property does not exist', function () {
            const data = new UnsafeData({foo: 'bar'});
            assert.throws(() => {
                data.key('baz');
            }, {message: 'baz is required'});
        });

        it('Throws if the property does not exist with context', function () {
            const data = new UnsafeData({foo: 'bar'}, {field: ['bar']});
            assert.throws(() => {
                data.key('baz');
            }, {message: 'bar.baz is required'});
        });
    });

    describe('nullable', function () {
        it('Returns data if not null', function () {
            const data = new UnsafeData({foo: 'bar'});
            assert.equal(
                data.nullable,
                data
            );
        });

        it('Returns proxy if null', function () {
            const data = new UnsafeData(null);
            assert.notEqual(
                data.nullable,
                data
            );

            assert.equal(
                data.nullable.string,
                null
            );
            assert.equal(
                data.nullable.boolean,
                null
            );
            assert.equal(
                data.nullable.number,
                null
            );
            assert.equal(
                data.nullable.integer,
                null
            );
            assert.equal(
                data.nullable.url,
                null
            );
            assert.equal(
                data.nullable.enum(['foo', 'bar']),
                null
            );
            const n = data.nullable;
            assert.equal(
                n.key('test'),
                n
            );
            assert.equal(
                data.nullable.key('test').string,
                null
            );
            assert.equal(
                data.nullable.optionalKey('test').string,
                null
            );
            assert.equal(
                data.nullable.array,
                null
            );
            assert.equal(
                data.nullable.index(0).string,
                null
            );
        });
    });

    describe('string', function () {
        it('Returns if a string', function () {
            const data = new UnsafeData('hello world');
            assert.equal(
                data.string,
                'hello world'
            );
        });

        it('Returns if an empty string', function () {
            const data = new UnsafeData('');
            assert.equal(
                data.string,
                ''
            );
        });

        it('Throws if a number', function () {
            const data = new UnsafeData(15);
            assert.throws(() => {
                data.string;
            }, {message: 'data must be a string'});
        });

        it('Throws if an object', function () {
            const data = new UnsafeData({});
            assert.throws(() => {
                data.string;
            }, {message: 'data must be a string'});
        });

        it('Throws if null', function () {
            const data = new UnsafeData(null, {field: ['obj', 'test']});
            assert.throws(() => {
                data.string;
            }, {message: 'obj.test must be a string'});
        });
    });

    describe('boolean', function () {
        it('Returns if true', function () {
            const data = new UnsafeData(true);
            assert.equal(
                data.boolean,
                true
            );
        });

        it('Returns if false', function () {
            const data = new UnsafeData(false);
            assert.equal(
                data.boolean,
                false
            );
        });

        it('Throws if 0', function () {
            const data = new UnsafeData(0);
            assert.throws(() => {
                data.boolean;
            }, {message: 'data must be a boolean'});
        });

        it('Throws if 1', function () {
            const data = new UnsafeData(1);
            assert.throws(() => {
                data.boolean;
            }, {message: 'data must be a boolean'});
        });

        it('Throws if an object', function () {
            const data = new UnsafeData({});
            assert.throws(() => {
                data.boolean;
            }, {message: 'data must be a boolean'});
        });

        it('Throws if null', function () {
            const data = new UnsafeData(null, {field: ['obj', 'test']});
            assert.throws(() => {
                data.boolean;
            }, {message: 'obj.test must be a boolean'});
        });
    });

    describe('number', function () {
        it('Returns if a number', function () {
            const data = new UnsafeData(15);
            assert.equal(
                data.number,
                15
            );
        });

        it('Returns if 0', function () {
            const data = new UnsafeData(0);
            assert.equal(
                data.number,
                0
            );
        });

        it('Returns if floating point', function () {
            const data = new UnsafeData(0.33);
            assert.equal(
                data.number,
                0.33
            );
        });

        it('Returns if -1', function () {
            const data = new UnsafeData(-1);
            assert.equal(
                data.number,
                -1
            );
        });

        it('Throws if NaN', function () {
            const data = new UnsafeData(NaN);
            assert.throws(() => {
                data.number;
            }, {message: 'data must be a finite number'});
        });

        it('Throws if Infinity', function () {
            const data = new UnsafeData(Infinity);
            assert.throws(() => {
                data.number;
            }, {message: 'data must be a finite number'});
        });

        it('Converts from string', function () {
            const data = new UnsafeData('15');
            assert.equal(
                data.number,
                15
            );
        });

        it('Converts from float string', function () {
            const data = new UnsafeData('15.33');
            assert.equal(
                data.number,
                15.33
            );
        });

        it('Throws if convert from string number with spaces', function () {
            const data = new UnsafeData('15 ');
            assert.throws(() => {
                data.number;
            }, {message: 'data must be a number, got string'});
        });

        it('Throws if a string', function () {
            const data = new UnsafeData('hello world');
            assert.throws(() => {
                data.number;
            }, {message: 'data must be a number, got string'});
        });

        it('Throws if an object', function () {
            const data = new UnsafeData({});
            assert.throws(() => {
                data.number;
            }, {message: 'data must be a number, got object'});
        });

        it('Throws if null', function () {
            const data = new UnsafeData(null, {field: ['obj', 'test']});
            assert.throws(() => {
                data.number;
            }, {message: 'obj.test must be a number, got object'});
        });
    });

    describe('integer', function () {
        it('Returns if a number', function () {
            const data = new UnsafeData(15);
            assert.equal(
                data.integer,
                15
            );
        });

        // Other tests
        it('Throws if floating point', function () {
            const data = new UnsafeData(0.33);
            assert.throws(() => {
                data.integer;
            }, {message: 'data must be an integer'});
        });

        it('Returns if -1', function () {
            const data = new UnsafeData(-1);
            assert.equal(
                data.integer,
                -1
            );
        });

        it('Throws if NaN', function () {
            const data = new UnsafeData(NaN);
            assert.throws(() => {
                data.integer;
            }, {message: 'data must be a finite number'});
        });

        it('Throws if Infinity', function () {
            const data = new UnsafeData(Infinity);
            assert.throws(() => {
                data.integer;
            }, {message: 'data must be a finite number'});
        });

        it('Converts from string', function () {
            const data = new UnsafeData('15');
            assert.equal(
                data.integer,
                15
            );
        });

        it('Throws if convert from float string', function () {
            const data = new UnsafeData('15.33', {field: ['bar']});
            assert.throws(() => {
                data.integer;
            }, {message: 'bar must be an integer'});
        });

        it('Throws if convert from string number with text', function () {
            const data = new UnsafeData('15 test', {field: ['bar']});
            assert.throws(() => {
                data.integer;
            }, {message: 'bar must be an integer'});
        });

        it('Throws if a string', function () {
            const data = new UnsafeData('hello world');
            assert.throws(() => {
                data.integer;
            }, {message: 'data must be an integer'});
        });

        it('Throws if an object', function () {
            const data = new UnsafeData({});
            assert.throws(() => {
                data.integer;
            }, {message: 'data must be a number, got object'});
        });

        it('Throws if null', function () {
            const data = new UnsafeData(null, {field: ['obj', 'test']});
            assert.throws(() => {
                data.integer;
            }, {message: 'obj.test must be a number, got object'});
        });

        it('Throws if too high', function () {
            const data = new UnsafeData(Math.pow(2, 53), {field: ['bar']});
            assert.throws(() => {
                data.integer;
            }, {message: 'bar must be an integer'});
        });
    });

    describe('url', function () {
        it('Returns if a URL object', function () {
            const u = new URL('https://example.com');
            const data = new UnsafeData(u);
            assert.equal(
                data.url,
                u
            );
        });

        it('Returns if a URL', function () {
            const data = new UnsafeData('https://example.com/path?query=string');
            assert.equal(
                data.url.toString(),
                'https://example.com/path?query=string'
            );
        });

        it('Returns if a http URL', function () {
            const data = new UnsafeData('http://example.com');
            assert.equal(
                data.url.toString(),
                'http://example.com/'
            );
        });

        it('Throws if a ftp URL', function () {
            const data = new UnsafeData('ftp://example.com');
            assert.throws(() => {
                data.url;
            }, {message: 'data must be a valid URL'});
        });

        it('Throws if a string', function () {
            const data = new UnsafeData('hello world');
            assert.throws(() => {
                data.url;
            }, {message: 'data must be a valid URL'});
        });

        it('Throws if an object', function () {
            const data = new UnsafeData({});
            assert.throws(() => {
                data.url;
            }, {message: 'data must be a string'});
        });

        it('Throws if null', function () {
            const data = new UnsafeData(null, {field: ['obj', 'test']});
            assert.throws(() => {
                data.url;
            }, {message: 'obj.test must be a string'});
        });
    });

    describe('enum', function () {
        it('Returns if a valid value', function () {
            const data = new UnsafeData('foo');
            assert.equal(
                data.enum(['foo', 'bar']),
                'foo'
            );
        });

        it('Works for numbers too', function () {
            const data = new UnsafeData(5);
            assert.equal(
                data.enum([5, 8]),
                5
            );
        });

        it('Throws if an invalid value', function () {
            const data = new UnsafeData('baz');
            assert.throws(() => {
                data.enum(['foo', 'bar']);
            }, {message: 'data must be one of foo, bar'});
        });
    });

    describe('array', function () {
        it('Returns if an array', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.equal(
                data.array[0].string,
                'foo'
            );
            assert.equal(
                data.array[1].string,
                'bar'
            );
        });

        it('Extends context', function () {
            const data = new UnsafeData(['foo', 'bar'], {field: ['baz']});
            assert.deepEqual(
                data.array[0],
                new UnsafeData('foo', {field: ['baz', '0']})
            );
            assert.deepEqual(
                data.array[1],
                new UnsafeData('bar', {field: ['baz', '1']})
            );
        });

        it('Throws if not an array', function () {
            const data = new UnsafeData('baz');
            assert.throws(() => {
                data.array;
            }, {message: 'data must be an array'});
        });
    });

    describe('index', function () {
        it('Returns if an array', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.equal(
                data.index(0).string,
                'foo'
            );
        });

        it('Extends context', function () {
            const data = new UnsafeData(['foo', 'bar'], {field: ['baz']});
            assert.deepEqual(
                data.index(0),
                new UnsafeData('foo', {field: ['baz', '0']})
            );
            assert.deepEqual(
                data.index(1),
                new UnsafeData('bar', {field: ['baz', '1']})
            );
        });

        it('Throws if not an array', function () {
            const data = new UnsafeData('baz');
            assert.throws(() => {
                data.index(0);
            }, {message: 'data must be an array'});
        });

        it('Throws if out of bounds', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.throws(() => {
                data.index(2);
            }, {message: 'data must be an array of length 3'});
        });

        it('Throws if out of lower bounds', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.throws(() => {
                data.index(-1);
            }, {message: 'index must be a positive integer'});
        });

        it('Throws if floating point', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.throws(() => {
                data.index(1.5);
            }, {message: 'index must be a positive integer'});
        });

        it('Throws if NaN', function () {
            const data = new UnsafeData(['foo', 'bar']);
            assert.throws(() => {
                data.index(NaN);
            }, {message: 'index must be a positive integer'});
        });
    });
});
