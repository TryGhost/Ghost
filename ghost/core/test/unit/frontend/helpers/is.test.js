const sinon = require('sinon');
const is = require('../../../../core/frontend/helpers/is');
const logging = require('@tryghost/logging');

describe('{{#is}} helper', function () {
    afterEach(function () {
        sinon.restore();
    });

    // All positive tests
    it('should match single context "index"', function () {
        const fn = sinon.spy();
        const inverse = sinon.spy();

        is.call(
            {},
            'index',
            {fn: fn, inverse: inverse, data: {root: {context: ['home', 'index']}}}
        );

        sinon.assert.called(fn);
        sinon.assert.notCalled(inverse);
    });

    it('should match OR context "index, paged"', function () {
        const fn = sinon.spy();
        const inverse = sinon.spy();

        is.call(
            {},
            'index, paged',
            {fn: fn, inverse: inverse, data: {root: {context: ['tag', 'paged']}}}
        );

        sinon.assert.called(fn);
        sinon.assert.notCalled(inverse);
    });

    it('should not match "paged"', function () {
        const fn = sinon.spy();
        const inverse = sinon.spy();

        is.call(
            {},
            'paged',
            {fn: fn, inverse: inverse, data: {root: {context: ['index', 'home']}}}
        );

        sinon.assert.notCalled(fn);
        sinon.assert.called(inverse);
    });

    it('should log warning with no args', function () {
        const fn = sinon.spy();
        const inverse = sinon.spy();
        const logWarn = sinon.stub(logging, 'warn');

        is.call(
            {},
            undefined,
            {fn: fn, inverse: inverse, data: {root: {context: ['index', 'home']}}}
        );

        sinon.assert.called(logWarn);
        sinon.assert.notCalled(fn);
        sinon.assert.notCalled(inverse);
    });
});
