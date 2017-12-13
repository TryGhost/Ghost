var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    moment = require('moment'),
    testUtils = require('../../../../utils'),
    common = require('../../../../../server/lib/common'),
    models = require('../../../../../server/models'),
    api = require('../../../../../server/api'),
    schedulingUtils = require('../../../../../server/adapters/scheduling/utils'),
    SchedulingDefault = require('../../../../../server/adapters/scheduling/SchedulingDefault'),
    postScheduling = require('../../../../../server/adapters/scheduling/post-scheduling'),
    urlService = require('../../../../../server/services/url'),

    sandbox = sinon.sandbox.create();

describe('Scheduling: Post Scheduling', function () {
    var scope = {
        events: {},
        scheduledPosts: [],
        apiUrl: 'localhost:1111/',
        client: null,
        post: null
    };

    before(function () {
        models.init();
    });

    beforeEach(function () {
        scope.client = models.Client.forge(testUtils.DataGenerator.forKnex.createClient({slug: 'ghost-scheduler'}));
        scope.post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
            id: 1337,
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')
        }));

        scope.adapter = new SchedulingDefault();

        sandbox.stub(api.schedules, 'getScheduledPosts').callsFake(function () {
            return Promise.resolve({posts: scope.scheduledPosts});
        });

        sandbox.stub(common.events, 'onMany').callsFake(function (events, stubDone) {
            events.forEach(function (event) {
                scope.events[event] = stubDone;
            });
        });

        sandbox.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(scope.adapter));

        sandbox.stub(models.Client, 'findOne').callsFake(function () {
            return Promise.resolve(scope.client);
        });

        sandbox.spy(scope.adapter, 'schedule');
        sandbox.spy(scope.adapter, 'reschedule');
    });

    afterEach(function () {
        sandbox.restore();
        return testUtils.teardown();
    });

    describe('fn:init', function () {
        describe('success', function () {
            it('will be scheduled', function (done) {
                postScheduling.init({
                    apiUrl: scope.apiUrl
                }).then(function () {
                    scope.events['post.scheduled'](scope.post);
                    scope.adapter.schedule.called.should.eql(true);

                    scope.adapter.schedule.calledWith({
                        time: moment(scope.post.get('published_at')).valueOf(),
                        url: urlService.utils.urlJoin(scope.apiUrl, 'schedules', 'posts', scope.post.get('id')) + '?client_id=' + scope.client.get('slug') + '&client_secret=' + scope.client.get('secret'),
                        extra: {
                            httpMethod: 'PUT',
                            oldTime: null
                        }
                    }).should.eql(true);

                    done();
                }).catch(done);
            });

            it('will load scheduled posts from database', function (done) {
                scope.scheduledPosts = [
                    models.Post.forge(testUtils.DataGenerator.forKnex.createPost({status: 'scheduled'})),
                    models.Post.forge(testUtils.DataGenerator.forKnex.createPost({status: 'scheduled'}))
                ];

                postScheduling.init({
                    apiUrl: scope.apiUrl
                }).then(function () {
                    scope.adapter.reschedule.calledTwice.should.eql(true);
                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('no url passed', function (done) {
                postScheduling.init()
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof common.errors.IncorrectUsageError).should.eql(true);
                        done();
                    });
            });
        });
    });
});
