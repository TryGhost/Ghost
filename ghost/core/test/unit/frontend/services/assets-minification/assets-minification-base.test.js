const assert = require('assert/strict');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const AssetsMinificationBase = require('../../../../../core/frontend/services/assets-minification/assets-minification-base');

describe('AssetsMinificationBase', function () {
    let testDir;

    before(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asset-base-tests-'));
    });

    after(async function () {
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
            assert.equal(next1.callCount, 1);
            assert.equal(next2.callCount, 1);
            assert.equal(next3.callCount, 1);
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
            assert.equal(next.callCount, 1);
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
            assert.equal(next.callCount, 2);
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

        it('clears loading promise even when load() throws', async function () {
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

            await assert.rejects(() => middleware({}, {}, next));

            assert.equal(assets.loading, null);
        });
    });
});
