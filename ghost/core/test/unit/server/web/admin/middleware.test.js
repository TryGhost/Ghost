const sinon = require('sinon');
const fs = require('node:fs/promises');
// Thing we are testing
const redirectAdminUrls = require('../../../../../core/server/web/admin/middleware/redirect-admin-urls');
const createServeAuthFrameFileMw = require('../../../../../core/server/web/admin/middleware/serve-auth-frame-file');
const path = require('node:path');

describe('Admin App', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('middleware', function () {
        describe('redirectAdminUrls', function () {
            let req;
            let res;
            let next;
            // Input: req.originalUrl
            // Output: either next or res.redirect are called
            beforeEach(function () {
                req = {};
                res = {};
                next = sinon.stub();
                res.redirect = sinon.stub();
            });

            it('should redirect a url which starts with ghost', function () {
                req.originalUrl = '/ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.false();
                res.redirect.called.should.be.true();
                res.redirect.calledWith('/ghost/#/x').should.be.true();
            });

            it('should not redirect /ghost/ on its owh', function () {
                req.originalUrl = '/ghost/';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });

            it('should not redirect url that has no slash', function () {
                req.originalUrl = 'ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });

            it('should not redirect url that starts with something other than /ghost/', function () {
                req.originalUrl = 'x/ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });
        });

        describe('serveAuthFrameFile', function () {
            let config;
            let urlUtils;
            let readFile;

            const siteUrl = 'https://foo.bar';
            const publicFilePath = 'foo/bar/public';

            const indexContent = '<html><body><h1>Hello, world!</h1></body></html>';
            const fooJsContent = '(function() { console.log("Hello, world!"); })();';
            const fooJsContentWithSiteOrigin = '(function() { console.log("{{SITE_ORIGIN}}"); })();';

            function createMiddleware() {
                return createServeAuthFrameFileMw(config, urlUtils);
            }

            beforeEach(function () {
                config = {
                    get: sinon.stub()
                };

                config.get.withArgs('paths').returns({
                    publicFilePath
                });

                urlUtils = {
                    getSiteUrl: sinon.stub().returns(siteUrl)
                };
                readFile = sinon.stub(fs, 'readFile');

                const adminAuthFilePath = filename => path.join(publicFilePath, 'admin-auth', filename);

                readFile.withArgs(adminAuthFilePath('index.html'))
                    .resolves(Buffer.from(indexContent));
                readFile.withArgs(adminAuthFilePath('foo.js'))
                    .resolves(Buffer.from(fooJsContent));
                readFile.withArgs(adminAuthFilePath('foo-2.js'))
                    .resolves(Buffer.from(fooJsContentWithSiteOrigin));
                readFile.withArgs(adminAuthFilePath('bar.js'))
                    .rejects(new Error('File not found'));
            });

            afterEach(function () {
                readFile.restore();
            });

            it('should serve index.html if the url is /', async function () {
                const middleware = createMiddleware();

                const req = {
                    url: '/'
                };
                const res = {
                    end: sinon.stub()
                };
                const next = sinon.stub();

                await middleware(req, res, next);

                res.end.calledWith(indexContent).should.be.true();
                next.called.should.be.false();
            });

            it('should serve the correct file corresponding to the url', async function () {
                const middleware = createMiddleware();

                const req = {
                    url: '/foo.js'
                };
                const res = {
                    end: sinon.stub()
                };
                const next = sinon.stub();

                await middleware(req, res, next);

                res.end.calledWith(fooJsContent).should.be.true();
                next.called.should.be.false();
            });

            it('should replace {{SITE_ORIGIN}} with the site url', async function () {
                const middleware = createMiddleware();

                const req = {
                    url: '/foo-2.js'
                };
                const res = {
                    end: sinon.stub()
                };
                const next = sinon.stub();

                await middleware(req, res, next);

                res.end.calledOnce.should.be.true();

                const args = res.end.getCall(0).args;
                args[0].toString().includes(siteUrl).should.be.true();
                args[0].toString().includes(`{{SITE_ORIGIN}}`).should.be.false();
            });

            it('should not allow path traversal', async function () {
                const middleware = createMiddleware();

                const req = {
                    url: '/foo/../../foo.js'
                };
                const res = {
                    end: sinon.stub()
                };
                const next = sinon.stub();

                await middleware(req, res, next);

                res.end.calledOnce.should.be.true();

                // Because we use base name when resolving the file, foo.js should be served
                res.end.calledWith(fooJsContent).should.be.true();

                next.calledOnce.should.be.false();
            });

            it('should call next if the file is not found', async function () {
                const middleware = createMiddleware();

                const req = {
                    url: '/bar.js'
                };
                const res = {
                    end: sinon.stub()
                };
                const next = sinon.stub();

                await middleware(req, res, next);

                res.end.calledOnce.should.be.false();
                next.calledOnce.should.be.true();
            });
        });
    });
});
