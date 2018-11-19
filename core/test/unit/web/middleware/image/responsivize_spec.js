const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const image = require('../../../../../server/lib/image');
const common = require('../../../../../server/lib/common');
const responsivize = require('../../../../../server/web/shared/middlewares/image/responsivize');
const fs = require('fs-extra');

const sandbox = sinon.sandbox.create();

describe('responsivize', function () {
    let res, req;

    beforeEach(function () {
        req = {
            file: {
                name: 'test',
                path: '/test/path',
                ext: '.jpg'
            },
            route: {
                path : '/uploads'
            }
        };
        sandbox.stub(image.manipulator, 'process');
        sandbox.stub(common.logging, 'error');
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    it('should do one manipulation by default', function (done) {
        image.manipulator.process.resolves();
        responsivize(req, res, function () {
            image.manipulator.process.calledOnce.should.be.true();
            done();
        });
    });

    it('should add files array to request object with original and processed files on default', function (done) {
        image.manipulator.process.resolves(true);

        responsivize(req, res, function () {
            req.files.length.should.be.equal(2);
            done();
        });
    });

    it('should not do any manipulation without resize flag set', function (done) {
        configUtils.set({
            imageOptimization: {
                resize: false,
            }
        });

        responsivize(req, res, function () {
            image.manipulator.process.called.should.be.false();
            done();
        });
    });

    it('should not create files array when processing fails', function (done) {
        image.manipulator.process.rejects();

        responsivize(req, res, () => {
            common.logging.error.calledOnce.should.be.true();
            req.file.should.not.be.equal(undefined);
            req.files.should.be.an.Array().and.be.empty();
            done();
        });
    });

    ['.gif', '.svg', '.svgz'].forEach(function (extension) {
        it(`should skip processing when file extension is ${extension}`, function (done) {
            req.file.ext = extension;
            responsivize(req, res, function () {
                req.file.should.not.be.equal(undefined);
                should.not.exist(req.files);
                done();
            });
        });
    });

    it('should do 4 image manipulations by default if responsive.enabled flag set', function (done) {
        image.manipulator.process.resolves(true);
        configUtils.set({
            imageOptimization: {
                responsive: {
                    enabled: true
                }
            }
        });
        responsivize(req, res, () => {
            image.manipulator.process.callCount.should.be.equal(4);
            req.files.length.should.be.equal(5);
            done();
        });
    });

    it('should discard invalid widhts (-1, undefined, null)', function (done) {
        image.manipulator.process.resolves(true);
        configUtils.set({
            imageOptimization: {
                responsive: {
                    enabled: true,
                    widths: {
                        a: -1,
                        b: undefined,
                        c: null
                    }
                }
            }
        });
        responsivize(req, res, () => {
            image.manipulator.process.callCount.should.be.equal(4);
            req.files.length.should.be.equal(5);
            done();
        });
    });

    it('should do the amount of uniques (imageOptimization.responsive.widths + 1) image manipulations', function (done) {
        image.manipulator.process.resolves(true);
        configUtils.set({
            imageOptimization: {
                responsive: {
                    enabled: true,
                    widths: {
                        a: 150 //Duplicated, so it omits.
                    }
                }
            }
        });
        responsivize(req, res, () => {
            image.manipulator.process.callCount.should.be.equal(4);
            req.files.length.should.be.equal(5);
            done();
        });
    });

    it('should delete the original image if responsive.deleteOriginal flag set', function (done) {
        image.manipulator.process.resolves(true);
        configUtils.set({
            imageOptimization: {
                responsive: {
                    enabled: false
                },
            deleteOriginal: true
            }
        });
        sandbox.stub(fs, 'unlink').resolves();
        responsivize(req, res, () => {
            image.manipulator.process.calledOnce.should.be.true();
            fs.unlink.calledWith('/test/path');
            req.files.length.should.be.equal(1);
            done();
        });
    });

    it('should do just one image manipulation if uploading profile pic', function (done) {
        image.manipulator.process.resolves(true);
        configUtils.set({
            imageOptimization: {
                responsive: {
                    enabled: true
                },
            deleteOriginal: false
            }
        });
        req.route.path = '/uploads/profile-image';
        responsivize(req, res, () => {
            image.manipulator.process.calledOnce.should.be.true();
            req.files.length.should.be.equal(2);
            done();
        });
    });
});
