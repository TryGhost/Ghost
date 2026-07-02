const assert = require('assert/strict');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const logging = require('@tryghost/logging');
const AssetsMinificationBase = require('../../../../../core/frontend/services/assets-minification/assets-minification-base');

describe('AssetsMinificationBase', function () {
    let testDir;

    beforeAll(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asset-base-tests-'));
    });

    afterAll(async function () {
        await fs.rm(testDir, {recursive: true});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('serveMiddleware', function () {
        it('calls load() only once when multiple requests arrive concurrently', async function () {
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    await new Promise((resolve) => {
                        setTimeout(resolve, 50);
                    });
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();

            const next1 = sinon.stub();
            const next2 = sinon.stub();
            const next3 = sinon.stub();

            await Promise.all([
                middleware({}, {}, next1),
                middleware({}, {}, next2),
                middleware({}, {}, next3)
            ]);

            assert.equal(loadCallCount, 1, 'load() should be called exactly once');
            sinon.assert.calledOnce(next1);
            sinon.assert.calledOnce(next2);
            sinon.assert.calledOnce(next3);
        });

        it('writes the asset file only once when concurrent requests trigger load()', async function () {
            const filePath = path.join(testDir, 'concurrent-safe.min.js');
            const content = 'b'.repeat(1000);
            let writeCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    writeCount += 1;
                    await fs.writeFile(filePath, content);
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();

            const readResults = [];
            const request = () => {
                return new Promise((resolve, reject) => {
                    middleware({}, {}, () => {
                        fs.readFile(filePath, 'utf8')
                            .then((data) => {
                                readResults.push(data);
                                resolve();
                            })
                            .catch(reject);
                    });
                });
            };

            await Promise.all([
                request(), request(), request(), request(), request()
            ]);

            assert.equal(writeCount, 1, 'file should be written exactly once');
            assert.equal(readResults.length, 5, 'all 5 requests should complete');
            for (const read of readResults) {
                assert.equal(read.length, content.length, 'every read should see full content');
            }
        });

        it('does not call load() when already ready', async function () {
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            assets.ready = true;

            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            await middleware({}, {}, next);

            assert.equal(loadCallCount, 0);
            sinon.assert.calledOnce(next);
        });

        it('calls load() again after invalidate()', async function () {
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            await middleware({}, {}, next);
            assert.equal(loadCallCount, 1);

            assets.invalidate();

            await middleware({}, {}, next);
            assert.equal(loadCallCount, 2);
        });

        it('does not clobber a new loading promise when invalidate() is called mid-flight', async function () {
            let loadCallCount = 0;
            let resolveFirstLoad;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    if (loadCallCount === 1) {
                        await new Promise((resolve) => {
                            resolveFirstLoad = resolve;
                        });
                    }
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            // First request starts load, which hangs
            const firstRequest = middleware({}, {}, next);

            // invalidate() mid-flight: clears loading and ready
            assets.invalidate();

            // Second request starts a new load since loading was cleared
            const secondRequest = middleware({}, {}, next);

            // First load settles — its .finally() must NOT clobber the second load
            resolveFirstLoad();
            await firstRequest;
            await secondRequest;

            assert.equal(loadCallCount, 2, 'load() should be called twice (once per invalidation cycle)');
            sinon.assert.calledTwice(next);
        });

        it('clears loading promise after load() completes', async function () {
            class TestAssets extends AssetsMinificationBase {
                async load() {
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            await middleware({}, {}, next);

            assert.equal(assets.loading, null);
        });

        it('clears loading promise and continues the request when load() throws', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            let shouldThrow = true;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    if (shouldThrow) {
                        shouldThrow = false;
                        throw new Error('load failed');
                    }
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            // The rejection must not escape the middleware — that would leave
            // the request hanging with no response
            await middleware({}, {}, next);

            sinon.assert.calledOnce(next);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(assets.loading, null);
        });
    });

    describe('ensureLoaded', function () {
        it('starts a build even when assets are marked ready', async function () {
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            assets.ready = true;

            await assets.ensureLoaded();

            assert.equal(loadCallCount, 1);
        });

        it('joins an in-flight build instead of starting a second one', async function () {
            let loadCallCount = 0;
            let resolveLoad;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    await new Promise((resolve) => {
                        resolveLoad = resolve;
                    });
                    this.ready = true;
                }
            }

            const assets = new TestAssets();

            const first = assets.ensureLoaded();
            const second = assets.ensureLoaded();

            resolveLoad();
            await Promise.all([first, second]);

            assert.equal(loadCallCount, 1, 'concurrent callers should share a single load()');
            assert.equal(assets.loading, null);
        });

        it('clears the loading promise when load() throws', async function () {
            class TestAssets extends AssetsMinificationBase {
                async load() {
                    throw new Error('load failed');
                }
            }

            const assets = new TestAssets();

            await assert.rejects(() => assets.ensureLoaded());

            assert.equal(assets.loading, null);
        });
    });
});
