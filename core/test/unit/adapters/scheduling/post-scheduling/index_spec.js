var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require(__dirname + '/../../../../../server/config'),
    testUtils = require(config.get('paths').corePath + '/test/utils'),
    errors = require(config.get('paths').corePath + '/server/errors'),
    events = require(config.get('paths').corePath + '/server/events'),
    models = require(config.get('paths').corePath + '/server/models'),
    api = require(config.get('paths').corePath + '/server/api'),
    schedulingUtils = require(config.get('paths').corePath + '/server/adapters/scheduling/utils'),
    SchedulingDefault = require(config.get('paths').corePath + '/server/adapters/scheduling/SchedulingDefault'),
    postScheduling = require(config.get('paths').corePath + '/server/adapters/scheduling/post-scheduling'),
    generalUtils = require(__dirname + '/../../../../../server/utils'),

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
        scope.post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({id: 1337, mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('something')}));

        scope.adapter = new SchedulingDefault();

        sandbox.stub(api.schedules, 'getScheduledPosts', function () {
            return Promise.resolve({posts: scope.scheduledPosts});
        });

        sandbox.stub(events, 'onMany', function (events, stubDone) {
            events.forEach(function (event) {
                scope.events[event] = stubDone;
            });
        });

        sandbox.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(scope.adapter));

        sandbox.stub(models.Client, 'findOne', function () {
            return Promise.resolve(scope.client);
        });

        sandbox.spy(scope.adapter, 'schedule');
        sandbox.spy(scope.adapter, 'reschedule');
    });

    afterEach(function (done) {
        sandbox.restore();
        testUtils.teardown(done);
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
                        url: generalUtils.url.urlJoin(scope.apiUrl, 'schedules', 'posts', scope.post.get('id')) + '?client_id=' + scope.client.get('slug') + '&client_secret=' + scope.client.get('secret'),
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
                        (err instanceof errors.IncorrectUsageError).should.eql(true);
                        done();
                    });
            });
        });
    });
});
