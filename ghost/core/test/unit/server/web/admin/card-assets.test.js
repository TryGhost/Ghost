const should = require('should');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const configUtils = require('../../../../utils/configUtils');
const logging = require('@tryghost/logging');

describe('AdminCardAssets', function () {
    let sandbox;
    let adminCardAssets;
    let testSrcDir;
    let testDestDir;

    beforeEach(async function () {
        sandbox = sinon.createSandbox();

        // Create temporary test directories
        testSrcDir = path.join(__dirname, 'test-card-src', 'cards');
        testDestDir = path.join(__dirname, 'test-card-dest', 'cards');

        // Configure test paths - AdminCardAssets adds 'cards' to these paths
        configUtils.set({
            paths: {
                assetSrc: path.dirname(testSrcDir), // AdminCardAssets will add '/cards'
                adminAssets: path.dirname(testDestDir) // AdminCardAssets will add '/cards'
            },
            caching: {
                admin: {
                    maxAge: 3600
                }
            }
        });

        // Create a fresh instance of AdminCardAssets for each test
        // Re-require to get a fresh instance since module exports a singleton
        delete require.cache[require.resolve('../../../../../core/server/web/admin/card-assets')];
        adminCardAssets = require('../../../../../core/server/web/admin/card-assets');

        // Stub logging to avoid noise in tests
        sandbox.stub(logging, 'warn');
        sandbox.stub(logging, 'error');
    });

    afterEach(async function () {
        sandbox.restore();
        await configUtils.restore();

        // Clean up test directories
        try {
            await fs.rm(testSrcDir, {recursive: true, force: true});
        } catch (err) {
            // Ignore if directory doesn't exist
        }
        try {
            await fs.rm(testDestDir, {recursive: true, force: true});
        } catch (err) {
            // Ignore if directory doesn't exist
        }
    });

    describe('constructor', function () {
        it('should initialize with correct default values', function () {
            adminCardAssets.ready.should.equal(false);
            adminCardAssets.files.should.deepEqual({});
            should.equal(adminCardAssets._loadingPromise, null);
        });
    });

    describe('ensureDestDir', function () {
        it('should create destination directory if it does not exist', async function () {
            await adminCardAssets.ensureDestDir();

            const stats = await fs.stat(adminCardAssets.dest);
            should(stats.isDirectory()).be.true();
        });

        it('should not throw error if directory already exists', async function () {
            // Create directory first
            await fs.mkdir(adminCardAssets.dest, {recursive: true});

            // Should not throw
            await adminCardAssets.ensureDestDir();

            const stats = await fs.stat(adminCardAssets.dest);
            should(stats.isDirectory()).be.true();
        });
    });

    describe('minifyAssets', function () {
        beforeEach(async function () {
            // Create test source files - note: no 'cards' subdirectory since testSrcDir is the cards dir
            await fs.mkdir(path.join(testSrcDir, 'css'), {recursive: true});
            await fs.mkdir(path.join(testSrcDir, 'js'), {recursive: true});

            await fs.writeFile(
                path.join(testSrcDir, 'css', 'card1.css'),
                '.card1 { color: red; }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'css', 'card2.css'),
                '.card2 { color: blue; }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'js', 'card1.js'),
                'function card1() { console.log("card1"); }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'js', 'card2.js'),
                'function card2() { console.log("card2"); }'
            );
        });

        it('should minify and combine CSS files', async function () {
            const globs = {
                'admin-cards.min.css': 'css/*.css'
            };

            await adminCardAssets.ensureDestDir();
            const result = await adminCardAssets.minifyAssets(globs);

            result.should.deepEqual(['admin-cards.min.css']);

            const minifiedContent = await fs.readFile(
                path.join(adminCardAssets.dest, 'admin-cards.min.css'),
                'utf8'
            );

            // Should contain both card styles minified (CleanCSS converts blue to #00f)
            minifiedContent.should.match(/\.card1\{color:red\}/);
            minifiedContent.should.match(/\.card2\{color:#00f\}/);
        });

        it('should minify and combine JS files', async function () {
            const globs = {
                'admin-cards.min.js': 'js/*.js'
            };

            await adminCardAssets.ensureDestDir();
            const result = await adminCardAssets.minifyAssets(globs);

            result.should.deepEqual(['admin-cards.min.js']);

            const minifiedContent = await fs.readFile(
                path.join(adminCardAssets.dest, 'admin-cards.min.js'),
                'utf8'
            );

            // Should contain both functions minified
            minifiedContent.should.match(/function card1\(\)/);
            minifiedContent.should.match(/function card2\(\)/);
        });

        it('should handle empty glob results', async function () {
            const globs = {
                'empty.css': 'nonexistent/*.css'
            };

            await adminCardAssets.ensureDestDir();

            // Create the source directory first so glob can scan it
            await fs.mkdir(path.join(testSrcDir, 'nonexistent'), {recursive: true});

            const result = await adminCardAssets.minifyAssets(globs);

            result.should.deepEqual([]);
        });
    });

    describe('load', function () {
        beforeEach(async function () {
            // Create test source files
            await fs.mkdir(path.join(testSrcDir, 'css'), {recursive: true});
            await fs.mkdir(path.join(testSrcDir, 'js'), {recursive: true});

            await fs.writeFile(
                path.join(testSrcDir, 'css', 'test.css'),
                '.test { color: red; }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'js', 'test.js'),
                'console.log("test");'
            );
        });

        it('should load and process assets successfully', async function () {
            await adminCardAssets.load();

            adminCardAssets.ready.should.be.true();
            adminCardAssets.hasFile('admin-cards.min.css').should.be.true();
            adminCardAssets.hasFile('admin-cards.min.js').should.be.true();

            const cssFile = adminCardAssets.getFile('admin-cards.min.css');
            const jsFile = adminCardAssets.getFile('admin-cards.min.js');

            should.exist(cssFile.path);
            should.exist(cssFile.etag);
            should.exist(jsFile.path);
            should.exist(jsFile.etag);

            // ETags should be valid MD5 hashes
            cssFile.etag.should.match(/^[a-f0-9]{32}$/);
            jsFile.etag.should.match(/^[a-f0-9]{32}$/);
        });

        it('should not load again if already ready', async function () {
            adminCardAssets.ready = true;
            const ensureDestDirSpy = sandbox.spy(adminCardAssets, 'ensureDestDir');

            await adminCardAssets.load();

            ensureDestDirSpy.called.should.be.false();
        });

        it('should handle errors gracefully', async function () {
            // Remove source directory to cause error
            await fs.rm(testSrcDir, {recursive: true, force: true});

            // Should not throw
            await adminCardAssets.load();

            adminCardAssets.ready.should.be.true(); // Should still mark as ready
            logging.error.calledOnce.should.be.true();
        });
    });

    describe('concurrent loading protection', function () {
        beforeEach(async function () {
            // Create test source files
            await fs.mkdir(path.join(testSrcDir, 'css'), {recursive: true});
            await fs.mkdir(path.join(testSrcDir, 'js'), {recursive: true});
            await fs.writeFile(
                path.join(testSrcDir, 'css', 'test.css'),
                '.test { color: red; }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'js', 'test.js'),
                'console.log("test");'
            );
        });

        it('should handle multiple simultaneous ensureLoaded calls', async function () {
            const loadSpy = sandbox.spy(adminCardAssets, 'load');

            // Start multiple simultaneous loads
            const promises = [
                adminCardAssets.ensureLoaded(),
                adminCardAssets.ensureLoaded(),
                adminCardAssets.ensureLoaded()
            ];

            const results = await Promise.all(promises);

            // All should return the same instance
            results[0].should.equal(adminCardAssets);
            results[1].should.equal(adminCardAssets);
            results[2].should.equal(adminCardAssets);

            // Load should only be called once despite multiple requests
            loadSpy.calledOnce.should.be.true();
            adminCardAssets.ready.should.be.true();
        });

        it('should reset loading promise after successful load', async function () {
            await adminCardAssets.ensureLoaded();

            // Loading promise should be null after completion
            should.equal(adminCardAssets._loadingPromise, null);
            adminCardAssets.ready.should.be.true();
        });

        it('should handle subsequent calls after loading is complete', async function () {
            // First load
            await adminCardAssets.ensureLoaded();
            adminCardAssets.ready.should.be.true();

            const loadSpy = sandbox.spy(adminCardAssets, 'load');

            // Subsequent call should not trigger load again
            const result = await adminCardAssets.ensureLoaded();

            result.should.equal(adminCardAssets);
            loadSpy.called.should.be.false();
        });
    });

    describe('hasFile and getFile', function () {
        it('should correctly identify and retrieve files', async function () {
            adminCardAssets.files = {
                'test.css': {
                    path: '/path/to/test.css',
                    etag: 'abc123'
                }
            };

            adminCardAssets.hasFile('test.css').should.be.true();
            adminCardAssets.hasFile('nonexistent.css').should.be.false();

            const file = adminCardAssets.getFile('test.css');
            file.should.deepEqual({
                path: '/path/to/test.css',
                etag: 'abc123'
            });
        });
    });

    describe('serveMiddleware', function () {
        let req, res, next;
        let middleware;

        beforeEach(async function () {
            // Set up test files
            await fs.mkdir(path.join(testSrcDir, 'css'), {recursive: true});
            await fs.mkdir(path.join(testSrcDir, 'js'), {recursive: true});
            await fs.writeFile(
                path.join(testSrcDir, 'css', 'test.css'),
                '.test { color: red; }'
            );
            await fs.writeFile(
                path.join(testSrcDir, 'js', 'test.js'),
                'console.log("test");'
            );

            await adminCardAssets.load();

            // Verify assets were loaded
            adminCardAssets.ready.should.be.true();
            adminCardAssets.hasFile('admin-cards.min.css').should.be.true();
            adminCardAssets.hasFile('admin-cards.min.js').should.be.true();

            middleware = adminCardAssets.serveMiddleware();

            req = {
                path: '/admin-cards.min.css',
                get: sandbox.stub()
            };
            res = {
                set: sandbox.stub(),
                status: sandbox.stub().returnsThis(),
                end: sandbox.stub(),
                type: sandbox.stub(),
                sendFile: sandbox.stub()
            };
            next = sandbox.stub();
        });

        it('should serve existing files with correct headers', async function () {
            await middleware(req, res, next);

            res.set.calledOnce.should.be.true();
            const setArgs = res.set.firstCall.args[0];
            setArgs.should.have.property('Cache-Control', 'public, max-age=3600');
            setArgs.should.have.property('ETag');

            res.type.calledWith('text/css').should.be.true();
            res.sendFile.calledOnce.should.be.true();
        });

        it('should return 304 for cached requests', async function () {
            const file = adminCardAssets.getFile('admin-cards.min.css');
            req.get.withArgs('If-None-Match').returns(file.etag);

            await middleware(req, res, next);

            res.status.calledWith(304).should.be.true();
            res.end.calledOnce.should.be.true();
            res.sendFile.called.should.be.false();
        });

        it('should call next() for unknown files', async function () {
            req.path = '/unknown.css';

            await middleware(req, res, next);

            next.calledOnce.should.be.true();
            res.sendFile.called.should.be.false();
        });

        it('should set correct content type for JS files', async function () {
            req.path = '/admin-cards.min.js';

            await middleware(req, res, next);

            res.type.calledWith('application/javascript').should.be.true();
        });

        it('should ensure assets are loaded before serving', async function () {
            // Create a fresh instance that hasn't been loaded
            delete require.cache[require.resolve('../../../../../core/server/web/admin/card-assets')];
            const freshInstance = require('../../../../../core/server/web/admin/card-assets');
            const freshMiddleware = freshInstance.serveMiddleware();

            const ensureLoadedSpy = sandbox.spy(freshInstance, 'ensureLoaded');

            await freshMiddleware(req, res, next);

            ensureLoadedSpy.calledOnce.should.be.true();
        });
    });
});
