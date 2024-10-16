require('should');
const sinon = require('sinon');
const path = require('path');
const configUtils = require('../../../../utils/configUtils');
const controller = require('../../../../../core/server/web/admin/controller');

describe('Admin App', function () {
    describe('controller', function () {
        const req = {};
        let res;

        beforeEach(async function () {
            res = {
                sendFile: sinon.spy()
            };

            await configUtils.restore();
            configUtils.set('paths:adminAssets', path.resolve('test/utils/fixtures/admin-build'));
        });

        afterEach(function () {
            sinon.restore();
        });

        it('adds x-frame-options header when adminFrameProtection is enabled (default)', function () {
            // default config: configUtils.set('adminFrameProtection', true);
            controller(req, res);

            res.sendFile.called.should.be.true();
            res.sendFile.calledWith(
                sinon.match.string,
                sinon.match.hasNested('headers.X-Frame-Options', sinon.match('sameorigin'))
            ).should.be.true();
        });

        it('doesn\'t add x-frame-options header when adminFrameProtection is disabled', function () {
            configUtils.set('adminFrameProtection', false);
            controller(req, res);

            res.sendFile.called.should.be.true();
            res.sendFile.calledWith(
                sinon.match.string,
                sinon.match.hasNested('headers.X-Frame-Options')
            ).should.be.false();
        });
    });
});
