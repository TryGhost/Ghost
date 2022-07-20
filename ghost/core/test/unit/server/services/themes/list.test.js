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
            should.not.exist(themeList.get());
        });

        it('getAll() returns all themes', function () {
            themeList.getAll().should.be.an.Object().with.properties('casper', 'not-casper');
            Object.keys(themeList.getAll()).should.have.length(2);
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
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
            themeList.del('casper');
            should.not.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
        });

        it('del() with no argument does nothing', function () {
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
            themeList.del();
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
        });

        it('init() calls set for each theme', function () {
            const setSpy = sinon.spy(themeList, 'set');

            themeList.init({test: {a: 'b'}, casper: {c: 'd'}});
            setSpy.calledTwice.should.be.true();
            setSpy.firstCall.calledWith('test', {a: 'b'}).should.be.true();
            setSpy.secondCall.calledWith('casper', {c: 'd'}).should.be.true();
        });

        it('init() with empty object resets the list', function () {
            themeList.init();
            const result = themeList.getAll();
            should.exist(result);
            result.should.be.an.Object();
            result.should.eql({});
            Object.keys(result).should.have.length(0);
        });
    });
});
