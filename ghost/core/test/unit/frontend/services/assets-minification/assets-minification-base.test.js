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

    describe('ensureLoaded', function () {
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

            assert.equal(first, second, 'both callers should get the same promise');

            resolveLoad();
            await Promise.all([first, second]);

            assert.equal(loadCallCount, 1);
            assert.equal(assets.ready, true);
            assert.equal(assets.loading, null);
        });

        it('does not rebuild within the backoff window after a failure and rejects with the stored error', async function () {
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
            assert.equal(assets.loading, null);

            // Second call within the backoff window: no new build, same error
            await assert.rejects(() => assets.ensureLoaded(), buildError);
            assert.equal(loadCallCount, 1, 'load() should not run again within the backoff window');
        });

        it('does not rebuild within the backoff window after a build that produced nothing', async function () {
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    // e.g. theme config asked for no assets: build succeeds
                    // but never sets ready via minify()
                    loadCallCount += 1;
                }
            }

            const assets = new TestAssets();

            await assets.ensureLoaded();
            assert.equal(loadCallCount, 1);

            // Resolves without starting another build
            await assets.ensureLoaded();
            assert.equal(loadCallCount, 1, 'load() should not run again within the backoff window');
        });

        it('rebuilds after the backoff window has passed', async function () {
            const clock = sinon.useFakeTimers({now: Date.now(), toFake: ['Date']});
            let loadCallCount = 0;

            class TestAssets extends AssetsMinificationBase {
                async load() {
                    loadCallCount += 1;
                    throw new Error(`build failed ${loadCallCount}`);
                }
            }

            const assets = new TestAssets();

            await assert.rejects(() => assets.ensureLoaded(), /build failed 1/);
            assert.equal(loadCallCount, 1);

            clock.tick(10001);

            await assert.rejects(() => assets.ensureLoaded(), /build failed 2/);
            assert.equal(loadCallCount, 2, 'load() should run again after the backoff window');
        });

        it('invalidate() resets the backoff so a config change rebuilds immediately', async function () {
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

            await assert.rejects(() => assets.ensureLoaded(), /build failed/);
            assert.equal(loadCallCount, 1);

            assets.invalidate();

            await assets.ensureLoaded();
            assert.equal(loadCallCount, 2, 'load() should run immediately after invalidate()');
            assert.equal(assets.ready, true);
        });

        it('re-runs load() when invalidate() is called mid-build, without concurrent loads', async function () {
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
            const first = assets.ensureLoaded();

            // Theme is activated mid-build: config changed, build result is stale
            assets.invalidate();

            // A second caller must join the in-flight build, not start a new one
            const second = assets.ensureLoaded();
            assert.equal(first, second, 'in-flight build must not be forgotten by invalidate()');

            resolveFirstLoad();
            await Promise.all([first, second]);

            assert.equal(loadCallCount, 2, 'load() should re-run with the new config');
            assert.equal(maxConcurrentLoads, 1, 'two loads must never run concurrently');
            assert.equal(assets.ready, true);
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

        it('continues the request (and logs) when load() rejects', async function () {
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
            sinon.assert.calledOnceWithExactly(loggingStub, buildError);
            assert.equal(assets.loading, null);
        });
    });
});
