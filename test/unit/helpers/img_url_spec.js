var should = require('should'),
    sinon = require('sinon'),
    urlUtils = require('../../utils/urlUtils'),

    // Stuff we are testing
    helpers = require('../../../frontend/helpers'),
    common = require('../../../server/lib/common');

describe('{{image}} helper', function () {
    var logWarnStub;

    beforeEach(function () {
        logWarnStub = sinon.stub(common.logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('without sub-directory', function () {
        let sandbox;

        before(function () {
            sandbox = sinon.createSandbox();
            urlUtils.stubUrlUtils({url: 'http://localhost:65535/'}, sandbox);
        });

        after(function () {
            sandbox.restore();
        });

        it('should output relative url of image', function () {
            var rendered = helpers.img_url('/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should output relative url of image if the input is absolute', function () {
            var rendered = helpers.img_url('http://localhost:65535/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should output absolute url of image if the option is present ', function () {
            var rendered = helpers.img_url('/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should NOT output absolute url of image if the option is "false" ', function () {
            var rendered = helpers.img_url('/content/images/image-relative-url.png', {hash: {absolute: 'false'}});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
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
    });

    describe('with sub-directory', function () {
        let sandbox;

        before(function () {
            sandbox = sinon.createSandbox();
            urlUtils.stubUrlUtils({url: 'http://localhost:65535/blog'}, sandbox);
        });

        after(function () {
            sandbox.restore();
        });

        it('should output relative url of image', function () {
            var rendered = helpers.img_url('/blog/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
        });

        it('should output absolute url of image if the option is present ', function () {
            var rendered = helpers.img_url('/blog/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/blog/content/images/image-relative-url.png');
        });

        it('should not change output for an external url', function () {
            var rendered = helpers.img_url('http://example.com/picture.jpg', {});
            should.exist(rendered);
            rendered.should.equal('http://example.com/picture.jpg');
        });
    });

    describe('image_sizes', function () {
        let sandbox;

        before(function () {
            sandbox = sinon.createSandbox();
            urlUtils.stubUrlUtils({url: 'http://localhost:65535/'}, sandbox);
        });

        after(function () {
            sandbox.restore();
        });

        it('should output correct url for absolute paths which are internal', function () {
            var rendered = helpers.img_url('http://localhost:65535/content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w400/my-coole-img.jpg');
        });
        it('should output the correct url for protocol relative urls', function () {
            var rendered = helpers.img_url('//website.com/whatever/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('//website.com/whatever/my-coole-img.jpg');
        });
        it('should output the correct url for relative paths', function () {
            var rendered = helpers.img_url('/content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w400/my-coole-img.jpg');
        });

        it('should output the correct url for relative paths without leading slash', function () {
            var rendered = helpers.img_url('content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('content/images/size/w400/my-coole-img.jpg');
        });
    });
});
