const assert = require('assert/strict');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const logging = require('@tryghost/logging');
const AssetsMinificationBase = require('../../../../../core/frontend/services/assets-minification/assets-minification-base');

const BUILD_MIN_INTERVAL_MS = 10000;

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

    describe('ensureLoaded', function () {
        it('joins an in-flight build: concurrent callers share one load()', async function () {
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

            await Promise.all([
                assets.ensureLoaded(),
                assets.ensureLoaded(),
                assets.ensureLoaded()
            ]);

            assert.equal(loadCallCount, 1, 'load() should be called exactly once');
        });

        it('does not rebuild within the backoff window after a failed build and rejects with the stored error', async function () {
            const clock = sinon.useFakeTimers({now: 1000000, toFake: ['Date']});
            let loadCallCount = 0;
            const buildError = new Error('build failed');

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    throw buildError;
                }
            }

            const assets = new TestAssets();

            await assert.rejects(() => assets.ensureLoaded(), buildError);
            assert.equal(loadCallCount, 1);

            // Within the backoff window: no build, rejects with the stored error
            clock.tick(BUILD_MIN_INTERVAL_MS - 1);
            await assert.rejects(() => assets.ensureLoaded(), buildError);
            assert.equal(loadCallCount, 1, 'load() should not be called within the backoff window');

            // After the window has elapsed a new build runs
            clock.tick(2);
            await assert.rejects(() => assets.ensureLoaded(), buildError);
            assert.equal(loadCallCount, 2, 'load() should run again once the backoff has expired');
        });

        it('does not rebuild within the backoff window after a resolved-but-not-ready build (EACCES-style)', async function () {
            const clock = sinon.useFakeTimers({now: 1000000, toFake: ['Date']});
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    // resolves, but ready stays false — mirrors minify()
                    // swallowing EACCES
                }
            }

            const assets = new TestAssets();

            await assets.ensureLoaded();
            assert.equal(loadCallCount, 1);
            assert.equal(assets.ready, false);

            clock.tick(BUILD_MIN_INTERVAL_MS - 1);
            await assets.ensureLoaded();
            assert.equal(loadCallCount, 1, 'load() should not be called within the backoff window');

            clock.tick(2);
            await assets.ensureLoaded();
            assert.equal(loadCallCount, 2);
        });

        it('invalidate() resets the backoff so the next ensureLoaded() builds immediately', async function () {
            sinon.useFakeTimers({now: 1000000, toFake: ['Date']});
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    if (loadCallCount === 1) {
                        throw new Error('build failed');
                    }
                    this.ready = true;
                }
            }

            const assets = new TestAssets();

            await assert.rejects(() => assets.ensureLoaded());
            assert.equal(loadCallCount, 1);

            assets.invalidate();

            await assets.ensureLoaded();
            assert.equal(loadCallCount, 2, 'load() should run immediately after invalidate()');
            assert.equal(assets.ready, true);
        });

        it('re-runs load() when invalidate() happens during an in-flight build, without concurrent loads', async function () {
            let loadCallCount = 0;
            let concurrentLoads = 0;
            let maxConcurrentLoads = 0;
            let resolveFirstLoad;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    concurrentLoads += 1;
                    maxConcurrentLoads = Math.max(maxConcurrentLoads, concurrentLoads);
                    try {
                        if (loadCallCount === 1) {
                            await new Promise((resolve) => {
                                resolveFirstLoad = resolve;
                            });
                        }
                        this.ready = true;
                    } finally {
                        concurrentLoads -= 1;
                    }
                }
            }

            const assets = new TestAssets();

            // First build starts and hangs
            const firstBuild = assets.ensureLoaded();

            // Theme switch mid-build: generation bumps, loading is kept
            assets.invalidate();

            // A caller arriving now joins the same in-flight build
            const secondCaller = assets.ensureLoaded();
            assert.equal(secondCaller, firstBuild, 'concurrent caller should join the in-flight build');

            resolveFirstLoad();
            await firstBuild;
            await secondCaller;

            assert.equal(loadCallCount, 2, 'load() should re-run after the mid-flight invalidation');
            assert.equal(maxConcurrentLoads, 1, 'two loads should never run concurrently');
            assert.equal(assets.ready, true);
        });

        it('clears loading after the build settles', async function () {
            class TestAssets extends AssetsMinificationBase {
                async load() {
                    this.ready = true;
                }
            }

            const assets = new TestAssets();
            await assets.ensureLoaded();

            assert.equal(assets.loading, null);
        });

        it('clears loading even when the build fails', async function () {
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

        it('continues the request and logs when load() rejects', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const buildError = new Error('load failed');

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    throw buildError;
                }
            }

            const assets = new TestAssets();
            const middleware = assets.serveMiddleware();
            const next = sinon.stub();

            // Must not reject — a rejection would hang the request under Express 4
            await middleware({}, {}, next);

            sinon.assert.calledOnce(next);
            assert.equal(next.firstCall.args.length, 0, 'next() should be called without an error');
            sinon.assert.calledOnceWithExactly(loggingStub, buildError);
            assert.equal(assets.loading, null, 'loading should be cleared after the build settles');
        });
    });
});
