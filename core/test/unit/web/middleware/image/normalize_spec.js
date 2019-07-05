const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const image = require('../../../../../server/lib/image');
const common = require('../../../../../server/lib/common');
const normalize = require('../../../../../server/web/shared/middlewares/image/normalize');

describe('normalize', function () {
    let res, req;

    beforeEach(function () {
        req = {
            file: {
                name: 'test',
                path: '/test/path',
                ext: '.jpg'
            }
        };

        sinon.stub(image.manipulator, 'process');
        sinon.stub(common.logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    it('should do manipulation by default', function (done) {
        image.manipulator.process.resolves();

        normalize(req, res, function () {
            image.manipulator.process.calledOnce.should.be.true();
            done();
        });
    });

    it('should add files array to request object with original and processed files', function (done) {
        image.manipulator.process.resolves();

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
            image.manipulator.process.called.should.be.false();
            done();
        });
    });

    it('should not create files array when processing fails', function (done) {
        image.manipulator.process.rejects();

        normalize(req, res, () => {
            common.logging.error.calledOnce.should.be.true();
            req.file.should.not.be.equal(undefined);
            should.not.exist(req.files);
            done();
        });
    });

    ['.gif', '.svg', '.svgz'].forEach(function (extension) {
        it(`should skip processing when file extension is ${extension}`, function (done) {
            req.file.ext = extension;
            normalize(req, res, function () {
                req.file.should.not.be.equal(undefined);
                should.not.exist(req.files);
                done();
            });
        });
    });
});
