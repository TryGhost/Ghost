const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const moment = require('moment');
const testUtils = require('../../../../../utils');
const models = require('../../../../../../core/server/models');
const events = require('../../../../../../core/server/lib/common/events');
const schedulingUtils = require('../../../../../../core/server/adapters/scheduling/utils');
const SchedulingDefault = require('../../../../../../core/server/adapters/scheduling/scheduling-default');
const urlUtils = require('../../../../../../core/shared/url-utils');
const PostScheduler = require('../../../../../../core/server/adapters/scheduling/post-scheduling/PostScheduler');
const nock = require('nock');

describe('Scheduling: Post Scheduler', function () {
    let adapter;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        adapter = new SchedulingDefault();

        sinon.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(adapter));

        sinon.spy(adapter, 'schedule');
        sinon.spy(adapter, 'unschedule');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('fn:constructor', function () {
        describe('success', function () {
            it('will be scheduled', async function () {
                const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
                    id: 1337,
                    mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
                }));
                nock('http://scheduler.local:1111')
                    .get(() => true)
                    .query(true)
                    .reply(200);
                nock('http://scheduler.local:1111')
                    .post(() => true)
                    .query(true)
                    .reply(200);
                nock('http://scheduler.local:1111')
                    .put(() => true)
                    .query(true)
                    .reply(200);

                new PostScheduler({
                    apiUrl: 'http://scheduler.local:1111/',
                    integration: {
                        api_keys: [{
                            id: 'integrationUniqueId',
                            secret: 'super-secret'
                        }]
                    },
                    adapter,
                    scheduledResources: {
                        posts: []
                    },
                    events
                });

                events.emit('post.scheduled', post);

                // let the events bubble up
                await new Promise(resolve => setTimeout(resolve, 100));

                adapter.schedule.called.should.eql(true);

                adapter.schedule.calledOnce.should.eql(true);

                adapter.schedule.args[0][0].time.should.equal(moment(post.get('published_at')).valueOf());
                adapter.schedule.args[0][0].url.should.startWith(urlUtils.urlJoin('http://scheduler.local:1111/', 'schedules', 'posts', post.get('id'), '?token='));
                adapter.schedule.args[0][0].extra.httpMethod.should.eql('PUT');
                should.equal(null, adapter.schedule.args[0][0].extra.oldTime);
            });
        });

        describe('error', function () {
            it('no apiUrl parameter passed', function () {
                try {
                    new PostScheduler();
                    throw new Error('should have thrown');
                } catch (err) {
                    (err instanceof errors.IncorrectUsageError).should.eql(true);
                }
            });
        });
    });
});
