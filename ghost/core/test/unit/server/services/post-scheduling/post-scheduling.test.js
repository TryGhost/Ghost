const assert = require('node:assert/strict');
const sinon = require('sinon');
const moment = require('moment');
const testUtils = require('../../../../utils');
const {Post} = require('../../../../../core/server/models/post');
const events = require('../../../../../core/server/lib/common/events');
const schedulingUtils = require('../../../../../core/server/adapters/scheduling/utils');
const SchedulingDefault = require('../../../../../core/server/adapters/scheduling/scheduling-default');
const urlUtils = require('../../../../../core/shared/url-utils');
const PostScheduling = require('../../../../../core/server/services/post-scheduling/post-scheduling').default;
const nock = require('nock');

describe('PostScheduling', function () {
    let adapter;
    let internalKeys;

    beforeEach(function () {
        adapter = new SchedulingDefault();
        // These tests only assert that schedule/unschedule are called with the
        // right arguments — they don't need the adapter to actually run. Stub
        // the internals that arm real setTimeout loops and fire real HTTP pings
        // (run = recursive 5-min loop, _execute = per-job ping timers,
        // _pingUrl = the got request). Otherwise the adapter leaves live timers
        // and in-flight requests behind that, under the shared module registry
        // (isolate: false), hang whichever file runs next in the worker — e.g.
        // scheduling-default's own real-HTTP pingUrl tests then time out.
        sinon.stub(adapter, 'run');
        sinon.stub(adapter, '_execute');
        sinon.stub(adapter, '_pingUrl').resolves();
        sinon.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(adapter));
        sinon.spy(adapter, 'schedule');
        sinon.spy(adapter, 'unschedule');

        internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'integrationUniqueId', secret: 'aaaa'})]
        ]);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('wires event handlers and starts the adapter', async function () {
            const post = Post.forge(testUtils.DataGenerator.forKnex.createPost({
                id: 1337,
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
            }));
            nock('http://scheduler.local:1111').get(() => true).query(true).reply(200);
            nock('http://scheduler.local:1111').post(() => true).query(true).reply(200);
            nock('http://scheduler.local:1111').put(() => true).query(true).reply(200);

            new PostScheduling({apiUrl: 'http://scheduler.local:1111/', internalKeys, adapter});

            events.emit('post.scheduled', post);
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });

            sinon.assert.calledOnce(adapter.schedule);
            assert.equal(adapter.schedule.args[0][0].time, moment(post.get('published_at')).valueOf());
            assert(adapter.schedule.args[0][0].url.startsWith(
                urlUtils.urlJoin('http://scheduler.local:1111/', 'schedules', 'posts', post.get('id'), '?token=')
            ));
            assert.equal(adapter.schedule.args[0][0].extra.httpMethod, 'PUT');
            assert.equal(adapter.schedule.args[0][0].extra.oldTime, null);
        });
    });

    describe('rescheduleAll', function () {
        function stubScheduledPost() {
            const post = Post.forge(testUtils.DataGenerator.forKnex.createPost({
                id: 4004,
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
            }));
            sinon.stub(Post, 'findAll').callsFake(({filter}) => {
                return Promise.resolve(filter.includes('type:post') ? [post] : []);
            });
            return post;
        }

        it('unschedules with the previous key and reschedules with the current key', async function () {
            stubScheduledPost();
            internalKeys = new Map([
                ['ghost-scheduler', Promise.resolve({id: 'k1', secret: 'aaaabbbb'})]
            ]);

            const service = new PostScheduling({apiUrl: 'http://scheduler.local:1111/', internalKeys, adapter});

            await service.rescheduleAll({previousKey: {id: 'k1', secret: 'ccccdddd'}});

            sinon.assert.calledOnce(adapter.unschedule);
            sinon.assert.calledOnce(adapter.schedule);
            assert.notEqual(
                adapter.unschedule.args[0][0].url,
                adapter.schedule.args[0][0].url,
                'unschedule URL (signed with old key) must differ from schedule URL (signed with new key)'
            );
        });

        it('rotation tells the adapter to actually delete the stale queued job', async function () {
            // Outcome: rotation requests a real (non-bootstrap) unschedule of
            // the previous-key URL, so the adapter writes a tombstone and the
            // stale callback is suppressed at execution time. Without this,
            // the old URL keeps firing and the server logs 401s. SchedulingDefault's
            // own tests cover the tombstone semantics; here we verify
            // PostScheduling honours the contract.
            stubScheduledPost();
            internalKeys = new Map([
                ['ghost-scheduler', Promise.resolve({id: 'k1', secret: 'aaaabbbb'})]
            ]);

            const service = new PostScheduling({apiUrl: 'http://scheduler.local:1111/', internalKeys, adapter});
            await service.rescheduleAll({previousKey: {id: 'k1', secret: 'ccccdddd'}});

            sinon.assert.calledOnce(adapter.unschedule);
            assert.equal(adapter.unschedule.args[0][1].bootstrap, false);
        });

        it('same-key rebuild marks unschedule as bootstrap so the new job survives', async function () {
            // Outcome: when no previousKey is supplied (boot), unschedule and
            // schedule use the same URL. PostScheduling must mark the
            // unschedule as bootstrap so the adapter skips the tombstone and
            // the about-to-be-scheduled job stays pingable.
            stubScheduledPost();
            internalKeys = new Map([
                ['ghost-scheduler', Promise.resolve({id: 'k1', secret: 'aaaabbbb'})]
            ]);

            const service = new PostScheduling({apiUrl: 'http://scheduler.local:1111/', internalKeys, adapter});
            await service.rescheduleAll();

            sinon.assert.calledOnce(adapter.unschedule);
            assert.equal(adapter.unschedule.args[0][1].bootstrap, true);
        });
    });
});
