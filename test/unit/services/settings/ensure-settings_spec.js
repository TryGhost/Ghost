const sinon = require('sinon'),
    should = require('should'),
    fs = require('fs-extra'),
    yaml = require('js-yaml'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../core/server/lib/common'),

    ensureSettings = require('../../../../core/frontend/services/settings/ensure-settings');

describe('UNIT > Settings Service ensure settings:', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/'));
        sinon.stub(fs, 'readFile');
        sinon.stub(fs, 'copy');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    describe('Ensure settings files', function () {
        it('returns yaml file from settings folder if it exists', function () {
            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/badroutes.yaml'), 'utf8').resolves('content');
            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/goodroutes.yaml'), 'utf8').resolves('content');

            return ensureSettings(['goodroutes', 'badroutes']).then(() => {
                fs.readFile.callCount.should.be.eql(2);
                fs.copy.called.should.be.false();
            });
        });

        it('copies default settings file if not found but does not overwrite existing files', function () {
            const expectedDefaultSettingsPath = path.join(__dirname, '../../../../core/frontend/services/settings/default-globals.yaml');
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/globals.yaml');
            const fsError = new Error('not found');
            fsError.code = 'ENOENT';

            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml'), 'utf8').resolves('content');
            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/globals.yaml'), 'utf8').rejects(fsError);
            fs.copy.withArgs(expectedDefaultSettingsPath, expectedContentPath).resolves();

            return ensureSettings(['routes', 'globals'])
                .then(() => {
                    fs.readFile.calledTwice.should.be.true();
                    fs.copy.calledOnce.should.be.true();
                });
        });

        it('copies default settings file if no file found', function () {
            const expectedDefaultSettingsPath = path.join(__dirname, '../../../../core/frontend/services/settings/default-routes.yaml');
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml');
            const fsError = new Error('not found');
            fsError.code = 'ENOENT';

            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml'), 'utf8').rejects(fsError);
            fs.copy.withArgs(expectedDefaultSettingsPath, expectedContentPath).resolves();

            return ensureSettings(['routes']).then(() => {
                fs.readFile.calledOnce.should.be.true();
                fs.copy.calledOnce.should.be.true();
            });
        });

        it('rejects, if error is not a not found error', function () {
            const expectedContentPath = path.join(__dirname, '../../../utils/fixtures/settings/');
            const fsError = new Error('no permission');
            fsError.code = 'EPERM';

            fs.readFile.withArgs(path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml'), 'utf8').rejects(fsError);

            return ensureSettings(['routes'])
                .then(() => {
                    throw new Error('Expected test to fail');
                })
                .catch((error) => {
                    should.exist(error);
                    error.message.should.be.eql(`Error trying to access settings files in ${expectedContentPath}.`);
                    fs.readFile.calledOnce.should.be.true();
                    fs.copy.called.should.be.false();
                });
        });
    });
});
