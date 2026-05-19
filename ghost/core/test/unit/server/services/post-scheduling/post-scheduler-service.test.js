const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const moment = require('moment');
const testUtils = require('../../../../utils');
const models = require('../../../../../core/server/models');
const events = require('../../../../../core/server/lib/common/events');
const schedulingUtils = require('../../../../../core/server/adapters/scheduling/utils');
const SchedulingDefault = require('../../../../../core/server/adapters/scheduling/scheduling-default');
const urlUtils = require('../../../../../core/shared/url-utils');
const PostSchedulerService = require('../../../../../core/server/services/post-scheduling/post-scheduler-service');
const nock = require('nock');

describe('Post Scheduler Service', function () {
    let adapter;
    let internalKeys;

    beforeEach(function () {
        adapter = new SchedulingDefault();

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
        it('throws when apiUrl is missing', function () {
            assert.throws(
                () => new PostSchedulerService(),
                err => err instanceof errors.IncorrectUsageError
            );
        });

        it('throws when internalKeys is missing', function () {
            assert.throws(
                () => new PostSchedulerService({apiUrl: 'http://scheduler.local:1111/'}),
                err => err instanceof errors.IncorrectUsageError
            );
        });

        it('wires event handlers and starts the adapter', async function () {
            const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
                id: 1337,
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
            }));
            nock('http://scheduler.local:1111').get(() => true).query(true).reply(200);
            nock('http://scheduler.local:1111').post(() => true).query(true).reply(200);
            nock('http://scheduler.local:1111').put(() => true).query(true).reply(200);

            new PostSchedulerService({
                apiUrl: 'http://scheduler.local:1111/',
                internalKeys,
                adapter,
                events
            });

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

    describe('reschedule', function () {
        it('unschedules with the previous key and reschedules with the current key', async function () {
            const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
                id: 4004,
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
            }));

            internalKeys = new Map([
                ['ghost-scheduler', Promise.resolve({id: 'k1', secret: 'aaaabbbb'})]
            ]);

            const service = new PostSchedulerService({
                apiUrl: 'http://scheduler.local:1111/',
                internalKeys,
                adapter,
                events
            });

            await service.reschedule(
                {post: [post], page: []},
                {previousKey: {id: 'k1', secret: 'ccccdddd'}}
            );

            sinon.assert.calledOnce(adapter.unschedule);
            sinon.assert.calledOnce(adapter.schedule);
            assert.notEqual(
                adapter.unschedule.args[0][0].url,
                adapter.schedule.args[0][0].url,
                'unschedule URL (signed with old key) must differ from schedule URL (signed with new key)'
            );
        });
    });
});
