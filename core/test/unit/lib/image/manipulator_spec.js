const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const imagemin = require('imagemin');
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
            sandbox.stub(fs, 'readFile').resolves('original');
            sandbox.stub(fs, 'writeFile').resolves();
            sandbox.stub(imagemin, 'buffer').resolves(new ArrayBuffer(1));

            sharpInstance = {
                metadata: sandbox.stub(),
                resize: sandbox.stub(),
                rotate: sandbox.stub(),
                toBuffer: sandbox.stub(),
            };

            sharp = sandbox.stub().callsFake(() => {
                return sharpInstance;
            });
            sharp.kernel = sandbox.stub();
            sharp.cache = sandbox.stub();
            testUtils.mockNotExistingModule('sharp', sharp);
        });

        it('resize image', function () {
            sharpInstance.metadata.resolves({width: 2000, height: 2000});
            sharpInstance.toBuffer.resolves({
                data: 'manipulated',
                info: {
                    size: 42
                }
            });

            return manipulator.process({width: 1000})
                .then(() => {
                    if (process.platform === 'win32') {
                        sharp.cache.calledOnce.should.be.true();
                    }
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('manipulated');
                });
        });

        it('skip resizing if image is too small', function () {
            sharpInstance.metadata.resolves({width: 50, height: 50});
            sharpInstance.toBuffer.resolves({
                data: 'manipulated',
                info: {
                    size: 42
                }
            });

            return manipulator.process({width: 1000})
                .then((check) => {
                    if (process.platform === 'win32') {
                        sharp.cache.calledOnce.should.be.true();
                    }
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();
                    should(check).be.exactly(false);
                    fs.writeFile.calledOnce.should.be.false();
                    fs.writeFile.calledWith('manipulated');
                });
        });

        it('uses original image as an output when the size (bytes) is bigger after manipulation', function () {
            sharpInstance.metadata.resolves({
                width: 2000,
                size: 10
            });

            sharpInstance.toBuffer.resolves({
                data: 'manipulated',
                info: {
                    size: 42
                }
            });

            return manipulator.process({width: 1000})
                .then(() => {
                    if (process.platform === 'win32') {
                        sharp.cache.calledOnce.should.be.true();
                    }
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();
                    sharpInstance.toBuffer.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('original');
                });
        });

        it('sharp throws error during processing', function () {
            sharpInstance.metadata.resolves({width: 500, height: 500});
            sharpInstance.toBuffer.resolves({
                data: 'manipulated',
                info: {
                    size: 42
                }
            });

            fs.writeFile.rejects(new Error('whoops'));

            return manipulator.process({width: 2000})
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof common.errors.InternalServerError).should.be.true;
                    err.code.should.eql('IMAGE_PROCESSING');
                    if (process.platform === 'win32') {
                        sharp.cache.calledOnce.should.be.true();
                    }
                    sharpInstance.metadata.calledOnce.should.be.true();
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
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
