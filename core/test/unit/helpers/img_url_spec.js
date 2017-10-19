var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),

    // Stuff we are testing
    helpers = require('../../../server/helpers'),
    logging = require('../../../server/logging'),

    sandbox = sinon.sandbox.create();

describe('{{image}} helper', function () {
    var logWarnStub;

    before(function () {
        configUtils.set({url: 'http://localhost:82832/'});
    });

    beforeEach(function () {
        logWarnStub = sandbox.stub(logging, 'warn');
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        configUtils.restore();
    });

    it('should output relative url of image', function () {
        var rendered = helpers.img_url('/content/images/image-relative-url.png', {});
        should.exist(rendered);
        rendered.should.equal('/content/images/image-relative-url.png');
        logWarnStub.called.should.be.false();
    });

    it('should output absolute url of image if the option is present ', function () {
        var rendered = helpers.img_url('/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.should.equal('http://localhost:82832/content/images/image-relative-url.png');
        logWarnStub.called.should.be.false();
    });

    it('should output author url', function () {
        var rendered = helpers.img_url('/content/images/author-image-relative-url.png', {});
        should.exist(rendered);
        rendered.should.equal('/content/images/author-image-relative-url.png');
        logWarnStub.called.should.be.false();
    });

    it('should have no output if the image attributeis not provided (with warning)', function () {
        var rendered = helpers.img_url({hash: {absolute: 'true'}});
        should.not.exist(rendered);
        logWarnStub.calledOnce.should.be.true();
    });

    it('should have no output if the image attribute evaluates to undefined (with warning)', function () {
        var rendered = helpers.img_url(undefined, {hash: {absolute: 'true'}});
        should.not.exist(rendered);
        logWarnStub.calledOnce.should.be.true();
    });

    it('should have no output if the image attribute evaluates to null (no waring)', function () {
        var rendered = helpers.img_url(null, {hash: {absolute: 'true'}});
        should.not.exist(rendered);
        logWarnStub.calledOnce.should.be.false();
    });

    describe('with sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:82832/blog'});
        });
        after(function () {
            configUtils.restore();
        });

        it('should output relative url of image', function () {
            var rendered = helpers.img_url('/blog/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
        });

        it('should output absolute url of image if the option is present ', function () {
            var rendered = helpers.img_url('/blog/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.should.equal('http://localhost:82832/blog/content/images/image-relative-url.png');
        });

        it('should not change output for an external url', function () {
            var rendered = helpers.img_url('http://example.com/picture.jpg', {});
            should.exist(rendered);
            rendered.should.equal('http://example.com/picture.jpg');
        });
    });
});
