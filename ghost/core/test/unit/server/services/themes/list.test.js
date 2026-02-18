const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const _ = require('lodash');
const themeList = require('../../../../../core/server/services/themes/list');

describe('Themes', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('List', function () {
        beforeEach(function () {
            themeList.init({
                casper: {foo: 'bar'},
                'not-casper': {bar: 'baz'}
            });
        });

        it('get() allows getting a single theme', function () {
            assert.deepEqual(themeList.get('casper'), {foo: 'bar'});
        });

        it('get() with no args should do nothing', function () {
            assert.equal(themeList.get(), undefined);
        });

        it('getAll() returns all themes', function () {
            assert.deepEqual(
                new Set(Object.keys(themeList.getAll())),
                new Set(['casper', 'not-casper'])
            );
        });

        it('set() updates an existing theme', function () {
            const origCasper = _.cloneDeep(themeList.get('casper'));
            themeList.set('casper', {magic: 'update'});

            assert.notDeepEqual(themeList.get('casper'), origCasper);
            assert.deepEqual(themeList.get('casper'), {magic: 'update'});
        });

        it('set() can add a new theme', function () {
            themeList.set('rasper', {color: 'red'});
            assert.deepEqual(themeList.get('rasper'), {color: 'red'});
        });

        it('del() removes a key from the list', function () {
            assertExists(themeList.get('casper'));
            assertExists(themeList.get('not-casper'));
            themeList.del('casper');
            assert.equal(themeList.get('casper'), undefined);
            assertExists(themeList.get('not-casper'));
        });

        it('del() with no argument does nothing', function () {
            assertExists(themeList.get('casper'));
            assertExists(themeList.get('not-casper'));
            themeList.del();
            assertExists(themeList.get('casper'));
            assertExists(themeList.get('not-casper'));
        });

        it('init() calls set for each theme', function () {
            const setSpy = sinon.spy(themeList, 'set');

            themeList.init({test: {a: 'b'}, casper: {c: 'd'}});
            assert.equal(setSpy.calledTwice, true);
            assert.equal(setSpy.firstCall.calledWith('test', {a: 'b'}), true);
            assert.equal(setSpy.secondCall.calledWith('casper', {c: 'd'}), true);
        });

        it('init() with empty object resets the list', function () {
            themeList.init();
            const result = themeList.getAll();
            assertExists(result);
            assert(_.isPlainObject(result));
            assert.deepEqual(result, {});
            assert.equal(Object.keys(result).length, 0);
        });
    });
});
