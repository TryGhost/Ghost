const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../../utils/configUtils');
const imageTransform = require('@tryghost/image-transform');
const logging = require('@tryghost/logging');
const normalize = require('../../../../../../core/server/web/api/middleware/normalize-image');

describe('normalize', function () {
    let res;
    let req;

    beforeEach(function () {
        req = {
            file: {
                name: 'test',
                path: '/test/path',
                ext: '.jpg'
            }
        };

        sinon.stub(imageTransform, 'resizeFromPath');
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    it('should do manipulation by default', function (done) {
        imageTransform.resizeFromPath.resolves();

        normalize(req, res, function () {
            imageTransform.resizeFromPath.calledOnce.should.be.true();
            done();
        });
    });

    it('should add files array to request object with original and resized files', function (done) {
        imageTransform.resizeFromPath.resolves();

        normalize(req, res, function () {
            req.files.length.should.be.equal(2);
            done();
        });
    });

    it('should not do manipulation without resize flag set', function (done) {
        configUtils.set({
            imageOptimization: {
                resize: false
            }
        });

        normalize(req, res, function () {
            imageTransform.resizeFromPath.called.should.be.false();
            done();
        });
    });

    it('should not create files array when resizing fails', function (done) {
        imageTransform.resizeFromPath.rejects();

        normalize(req, res, () => {
            logging.error.calledOnce.should.be.true();
            req.file.should.not.be.equal(undefined);
            should.not.exist(req.files);
            done();
        });
    });

    ['.svg', '.svgz'].forEach(function (extension) {
        it(`should skip resizing when file extension is ${extension}`, function (done) {
            req.file.ext = extension;
            normalize(req, res, function () {
                req.file.should.not.be.equal(undefined);
                should.not.exist(req.files);
                done();
            });
        });
    });
});
