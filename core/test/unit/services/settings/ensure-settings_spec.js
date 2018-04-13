'use strict';

const sinon = require('sinon'),
    should = require('should'),
    fs = require('fs-extra'),
    yaml = require('js-yaml'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../server/lib/common'),

    ensureSettings = require('../../../../server/services/settings/ensure-settings'),

    sandbox = sinon.sandbox.create();

describe('UNIT > Settings Service:', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/'));
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('Ensure settings files', function () {
        it('returns yaml file from settings folder if it exists', function () {
            const fsAccessSpy = sandbox.spy(fs, 'access');

            return ensureSettings(['goodroutes', 'badroutes']).then(() => {
                fsAccessSpy.callCount.should.be.eql(2);
            });
        });

        it('copies default settings file if not found but does not overwrite existing files', function () {
            const expectedDefaultSettingsPath = path.join(__dirname, '../../../../server/services/settings/default-globals.yaml');
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/globals.yaml');
            const fsError = new Error('not found');
            fsError.code = 'ENOENT';
            const fsAccessStub = sandbox.stub(fs, 'access');
            const fsCopyStub = sandbox.stub(fs, 'copy').resolves();

            fsAccessStub.onFirstCall().resolves();
            // route file in settings directotry is not found
            fsAccessStub.onSecondCall().rejects(fsError);

            return ensureSettings(['routes', 'globals'])
            .then(() => {
                fsAccessStub.calledTwice.should.be.true();
            }).then(() => {
                fsCopyStub.calledWith(expectedDefaultSettingsPath, expectedContentPath).should.be.true();
                fsCopyStub.calledOnce.should.be.true();
            });
        });

        it('copies default settings file if no file found', function () {
            const expectedDefaultSettingsPath = path.join(__dirname, '../../../../server/services/settings/default-routes.yaml');
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml');
            const fsError = new Error('not found');
            fsError.code = 'ENOENT';
            const fsAccessStub = sandbox.stub(fs, 'access').rejects(fsError);
            const fsCopyStub = sandbox.stub(fs, 'copy').resolves();

            return ensureSettings(['routes']).then(() => {
                fsAccessStub.calledOnce.should.be.true();
                fsCopyStub.calledWith(expectedDefaultSettingsPath, expectedContentPath).should.be.true();
                fsCopyStub.calledOnce.should.be.true();
            });
        });

        it('rejects, if error is not a not found error', function () {
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/');
            const fsError = new Error('no permission');
            fsError.code = 'EPERM';
            const fsAccessStub = sandbox.stub(fs, 'access').rejects(new Error('Oopsi!'));

            return ensureSettings(['routes']).catch((error) => {
                should.exist(error);
                error.message.should.be.eql(`Error trying to access settings files in ${expectedContentPath}.`);
                fsAccessStub.calledOnce.should.be.true();
            });
        });
    });
});
