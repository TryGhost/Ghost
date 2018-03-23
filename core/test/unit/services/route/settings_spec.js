'use strict';

const sinon = require('sinon'),
    should = require('should'),
    rewire = require('rewire'),

    settingsRouter = rewire('../../../../server/services/route/settings'),

    sandbox = sinon.sandbox.create();

describe.skip('Routes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Settings', function () {
        // beforeEach(function () {
        //
        // });

        describe('ensureRoutesFile', function () {
            it('returns true if a file exists', function () {
                const result = settingsRouter;
                console.log('result:', result);
            });
            it('copies default routes file if no file found');
            it('returns false if an error occurs');
        });

        describe('loadSettings', function () {
            it('can parse a yaml file and returns a routes object');
            it('can handle parsing error and shows clear error message');
            it('can hanlde error from ensureRoutesFile');
        });
    });
});
