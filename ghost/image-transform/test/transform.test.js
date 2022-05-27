// Switch these lines once there are useful utils
const testUtils = require('./utils');
const fs = require('fs-extra');
const errors = require('@tryghost/errors');

const transform = require('../');

describe('Transform', function () {
    afterEach(function () {
        sinon.restore();
        testUtils.modules.unmockNonExistentModule();
    });

    describe('canTransformFiles', function () {
        it('returns true when sharp is available', function () {
            transform.canTransformFiles().should.be.true;
        });

        it('returns false when sharp is not available', function () {
            testUtils.modules.mockNonExistentModule('sharp', new Error(), true);
            transform.canTransformFiles().should.be.false;
        });
    });

    describe('canTransformFileExtension', function () {
        it('returns true for ".gif"', function () {
            should.equal(
                transform.canTransformFileExtension('.gif'),
                true
            );
        });
        it('returns true for ".svg"', function () {
            should.equal(
                transform.canTransformFileExtension('.svg'),
                true
            );
        });
        it('returns true for ".svgz"', function () {
            should.equal(
                transform.canTransformFileExtension('.svgz'),
                true
            );
        });
        it('returns false for ".ico"', function () {
            should.equal(
                transform.canTransformFileExtension('.ico'),
                false
            );
        });
    });

    describe('shouldResizeFileExtension', function () {
        it('returns true for ".gif"', function () {
            should.equal(
                transform.shouldResizeFileExtension('.gif'),
                true
            );
        });
        it('returns false for ".svg"', function () {
            should.equal(
                transform.shouldResizeFileExtension('.svg'),
                false
            );
        });
        it('returns false for ".svgz"', function () {
            should.equal(
                transform.shouldResizeFileExtension('.svgz'),
                false
            );
        });
        it('returns false for ".ico"', function () {
            should.equal(
                transform.shouldResizeFileExtension('.ico'),
                false
            );
        });
    });

    describe('cases', function () {
        let sharp, sharpInstance;

        beforeEach(function () {
            sinon.stub(fs, 'readFile').resolves('original');
            sinon.stub(fs, 'writeFile').resolves();

            sharpInstance = {
                resize: sinon.stub().returnsThis(),
                rotate: sinon.stub().returnsThis(),
                toBuffer: sinon.stub()
            };

            sharp = sinon.stub().callsFake(() => {
                return sharpInstance;
            });

            sharp.cache = sinon.stub().returns({});

            testUtils.modules.mockNonExistentModule('sharp', sharp);
        });

        it('resize image', function () {
            sharpInstance.toBuffer.resolves('manipulated');

            return transform.resizeFromPath({width: 1000})
                .then(() => {
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('manipulated');
                });
        });

        it('skip resizing if image is too small', function () {
            sharpInstance.toBuffer.resolves('manipulated');

            return transform.resizeFromPath({width: 1000})
                .then(() => {
                    sharpInstance.resize.calledOnce.should.be.true();
                    should.deepEqual(sharpInstance.resize.args[0][2], {
                        withoutEnlargement: true
                    });

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('manipulated');
                });
        });

        it('uses original image as an output when the size (bytes) is bigger after manipulation', function () {
            sharpInstance.toBuffer.resolves('manipulated to a very very very very very very very large size');

            return transform.resizeFromPath({width: 1000})
                .then(() => {
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();
                    sharpInstance.toBuffer.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('original');
                });
        });

        it('sharp throws error during processing', function () {
            sharpInstance.toBuffer.resolves('manipulated');

            fs.writeFile.rejects(new Error('whoops'));

            return transform.resizeFromPath({width: 2000})
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof errors.InternalServerError).should.be.true;
                    err.code.should.eql('IMAGE_PROCESSING');
                });
        });
    });

    describe('installation', function () {
        beforeEach(function () {
            testUtils.modules.mockNonExistentModule('sharp', new Error(), true);
        });

        it('sharp was not installed', function () {
            return transform.resizeFromPath()
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof errors.InternalServerError).should.be.true();
                    err.code.should.eql('SHARP_INSTALLATION');
                });
        });
    });

    describe('generateOriginalImageName', function () {
        it('correctly adds suffix', function () {
            transform.generateOriginalImageName('test.jpg').should.eql('test_o.jpg');
            transform.generateOriginalImageName('content/images/test.jpg').should.eql('content/images/test_o.jpg');
            transform.generateOriginalImageName('content/images/test_o.jpg').should.eql('content/images/test_o_o.jpg');
            transform.generateOriginalImageName('content/images/test-1.jpg').should.eql('content/images/test-1_o.jpg');
        });
    });
});
