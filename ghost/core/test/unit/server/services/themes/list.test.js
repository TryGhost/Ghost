const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');
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
            themeList.get('casper').should.eql({foo: 'bar'});
        });

        it('get() with no args should do nothing', function () {
            assert.equal(themeList.get(), undefined);
        });

        it('getAll() returns all themes', function () {
            themeList.getAll().should.be.an.Object().with.properties('casper', 'not-casper');
            assert.equal(Object.keys(themeList.getAll()).length, 2);
        });

        it('set() updates an existing theme', function () {
            const origCasper = _.cloneDeep(themeList.get('casper'));
            themeList.set('casper', {magic: 'update'});

            themeList.get('casper').should.not.eql(origCasper);
            themeList.get('casper').should.eql({magic: 'update'});
        });

        it('set() can add a new theme', function () {
            themeList.set('rasper', {color: 'red'});
            themeList.get('rasper').should.eql({color: 'red'});
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
            result.should.be.an.Object();
            result.should.eql({});
            assert.equal(Object.keys(result).length, 0);
        });
    });
});
