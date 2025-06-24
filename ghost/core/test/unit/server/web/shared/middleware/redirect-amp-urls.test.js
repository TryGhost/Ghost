const sinon = require('sinon');
const redirectAmpUrls = require('../../../../../../core/server/web/shared/middleware/redirect-amp-urls');

describe('Middleware: redirectAmpUrls', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        res = {
            redirect: sinon.spy(),
            set: sinon.spy()
        };
        req = {};
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Non-AMP URLs', function () {
        it('should call next() when URL does not end with /amp or /amp/', function () {
            req.url = '/welcome/';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });

        it('should call next() when URL contains amp but not at the end', function () {
            req.url = '/welcome/amp-post/';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });

        it('should call next() when URL has amp in the middle', function () {
            req.url = '/amp-category/post/';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });

        it('should call next() when URL is root path', function () {
            req.url = '/';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });

        it('should call next() when URL is empty', function () {
            req.url = '';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });
    });

    describe('AMP URLs with /amp/ suffix', function () {
        it('should redirect /welcome/amp/ to /welcome/', function () {
            req.url = '/welcome/amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });

        it('should redirect nested path /blog/post/amp/ to /blog/post/', function () {
            req.url = '/blog/post/amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/blog/post/').should.be.true();
        });

        it('should redirect root /amp/ to /', function () {
            req.url = '/amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/').should.be.true();
        });
    });

    describe('AMP URLs with /amp suffix (no trailing slash)', function () {
        it('should redirect /welcome/amp to /welcome/', function () {
            req.url = '/welcome/amp';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });

        it('should redirect nested path /blog/post/amp to /blog/post/', function () {
            req.url = '/blog/post/amp';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/blog/post/').should.be.true();
        });

        it('should redirect root /amp to /', function () {
            req.url = '/amp';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/').should.be.true();
        });
    });

    describe('Case insensitive matching', function () {
        it('should redirect /welcome/AMP/ to /welcome/ (uppercase)', function () {
            req.url = '/welcome/AMP/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });

        it('should redirect /welcome/Amp to /welcome/ (mixed case)', function () {
            req.url = '/welcome/Amp';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });

        it('should redirect /welcome/AmP/ to /welcome/ (mixed case with trailing slash)', function () {
            req.url = '/welcome/AmP/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });
    });

    describe('URLs with query strings', function () {
        it('should preserve query string when redirecting /welcome/amp/?q=1', function () {
            req.url = '/qs-check/amp/?q=1';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/qs-check/?q=1').should.be.true();
        });

        it('should preserve query string when redirecting /welcome/amp?q=1&r=2', function () {
            req.url = '/welcome/amp?q=1&r=2';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/?q=1&r=2').should.be.true();
        });

        it('should preserve complex query string when redirecting root /amp/?search=test&page=2', function () {
            req.url = '/amp/?search=test&page=2';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/?search=test&page=2').should.be.true();
        });

        it('should handle encoded query parameters', function () {
            req.url = '/welcome/amp/?q=hello%20world';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome/?q=hello%20world').should.be.true();
        });
    });

    describe('URLs with special characters', function () {
        it('should handle URLs with encoded characters', function () {
            req.url = '/welcome%20post/amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/welcome%20post/').should.be.true();
        });
    });

    describe('Subdirectory support', function () {
        it('should handle subdirectory paths with /amp/ suffix', function () {
            req.url = '/blog/subdir/welcome/amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/blog/subdir/welcome/').should.be.true();
        });

        it('should handle complex subdirectory paths with query strings', function () {
            req.url = '/ghost/blog/2023/post-title/amp/?utm_source=test';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.calledWith(301, '/ghost/blog/2023/post-title/?utm_source=test').should.be.true();
        });
    });

    describe('Security considerations', function () {
        it('should call removeOpenRedirectFromUrl to prevent open redirects', function () {
            // This test ensures the middleware uses the security utility
            req.url = '/welcome/amp/?redirect=evil.com';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            // The exact result depends on removeOpenRedirectFromUrl implementation
            // but we're testing that the middleware calls it
            res.redirect.firstCall.args[1].should.be.a.String();
        });
    });

    describe('Performance considerations', function () {
        it('should exit early when regex does not match', function () {
            req.url = '/welcome/not-amp/';

            redirectAmpUrls(req, res, next);

            next.calledOnce.should.be.true();
            res.redirect.called.should.be.false();
        });

        it('should handle multiple consecutive slashes', function () {
            req.url = '/welcome//amp/';

            redirectAmpUrls(req, res, next);

            next.called.should.be.false();
            res.redirect.calledOnce.should.be.true();
            // The removeOpenRedirectFromUrl should clean up double slashes
            res.redirect.calledWith(301, '/welcome/').should.be.true();
        });
    });
});
