const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const common = require('../../../../server/lib/common');
const manipulator = require('../../../../server/lib/image/manipulator');
const testUtils = require('../../../utils');

describe('lib/image: manipulator', function () {
    afterEach(function () {
        sinon.restore();
        testUtils.unmockNotExistingModule();
    });

    describe('canTransformFileExtension', function () {
        it('returns false for ".gif"', function () {
            should.equal(
                manipulator.canTransformFileExtension('.gif'),
                false
            );
        });
        it('returns false for ".svg"', function () {
            should.equal(
                manipulator.canTransformFileExtension('.svg'),
                false
            );
        });
        it('returns false for ".svgz"', function () {
            should.equal(
                manipulator.canTransformFileExtension('.svgz'),
                false
            );
        });
        it('returns false for ".ico"', function () {
            should.equal(
                manipulator.canTransformFileExtension('.ico'),
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

            testUtils.mockNotExistingModule('sharp', sharp);
        });

        it('resize image', function () {
            sharpInstance.toBuffer.resolves('manipulated');

            return manipulator.process({width: 1000})
                .then(() => {
                    sharpInstance.resize.calledOnce.should.be.true();
                    sharpInstance.rotate.calledOnce.should.be.true();

                    fs.writeFile.calledOnce.should.be.true();
                    fs.writeFile.calledWith('manipulated');
                });
        });

        it('skip resizing if image is too small', function () {
            sharpInstance.toBuffer.resolves('manipulated');

            return manipulator.process({width: 1000})
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

            return manipulator.process({width: 1000})
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

            return manipulator.process({width: 2000})
                .then(() => {
                    '1'.should.eql(1, 'Expected to fail');
                })
                .catch((err) => {
                    (err instanceof common.errors.InternalServerError).should.be.true;
                    err.code.should.eql('IMAGE_PROCESSING');
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
