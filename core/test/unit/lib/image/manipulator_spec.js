const should = require('should');
const sinon = require('sinon');
const common = require('../../../../server/lib/common');
const manipulator = require('../../../../server/lib/image/manipulator');
const testUtils = require('../../../utils');
const sandbox = sinon.sandbox.create();

describe('lib/image: manipulator', function () {
    afterEach(function () {
        sandbox.restore();
        testUtils.unmockNotExistingModule();
    });

    describe('cases', function () {
        let sharp, sharpInstance;

        beforeEach(function () {
            sharpInstance = {
                metadata: sandbox.stub(),
                resize: sandbox.stub(),
                rotate: sandbox.stub(),
                toFile: sandbox.stub()
            };

            sharp = sandbox.stub().callsFake(() => {
                return sharpInstance;
            });

            sharp.cache = sandbox.stub();
            testUtils.mockNotExistingModule('sharp', sharp);
        });

        it('resize image', function () {
            sharpInstance.metadata.resolves({width: 2000, height: 2000});
            sharpInstance.toFile.resolves();

            return manipulator.process({width: 1000})
                .then(() => {
                    sharp.cache.calledOnce.should.be.true();
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.toFile.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();
                });
        });

        it('skip resizing if image is too small', function () {
            sharpInstance.metadata.resolves({width: 50, height: 50});
            sharpInstance.toFile.resolves();

            return manipulator.process({width: 1000})
                .then(() => {
                    sharp.cache.calledOnce.should.be.true();
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.toFile.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.false();
                    sharpInstance.rotate.calledOnce.should.be.true();
                });
        });

        it('sharp throws error during processing', function () {
            sharpInstance.metadata.resolves({width: 500, height: 500});
            sharpInstance.toFile.rejects(new Error('whoops'));

            return manipulator.process({width: 2000})
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof common.errors.InternalServerError).should.be.true;
                    err.code.should.eql('IMAGE_PROCESSING');
                    sharp.cache.calledOnce.should.be.true;
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.toFile.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.false();
                    sharpInstance.rotate.calledOnce.should.be.true();
                });
        });
    });

    describe('installation', function () {
        beforeEach(function () {
            testUtils.mockNotExistingModule('sharp', new Error(), true);
        });

        it('sharp was not installed', function () {
            return manipulator.process()
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof common.errors.InternalServerError).should.be.true();
                    err.code.should.eql('SHARP_INSTALLATION');
                });
        });
    });
});
