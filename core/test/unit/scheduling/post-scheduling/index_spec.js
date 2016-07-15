
var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require(__dirname + '/../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    errors = require(config.paths.corePath + '/server/errors'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    api = require(config.paths.corePath + '/server/api'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault'),
    postScheduling = require(config.paths.corePath + '/server/scheduling/post-scheduling');

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
        scope.post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({id: 1337, markdown: 'something'}));

        scope.adapter = new SchedulingDefault();

        sinon.stub(api.schedules, 'getScheduledPosts', function () {
            return Promise.resolve({posts: scope.scheduledPosts});
        });

        sinon.stub(events, 'onMany', function (events, stubDone) {
            events.forEach(function (event) {
                scope.events[event] = stubDone;
            });
        });

        sinon.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(scope.adapter));

        models.Client.findOne = function () {
            return Promise.resolve(scope.client);
        };

        sinon.spy(scope.adapter, 'schedule');
        sinon.spy(scope.adapter, 'reschedule');
    });

    afterEach(function (done) {
        scope.adapter.schedule.reset();
        schedulingUtils.createAdapter.restore();
        scope.adapter.schedule.restore();
        scope.adapter.reschedule.restore();
        events.onMany.restore();
        api.schedules.getScheduledPosts.restore();
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
                        url: scope.apiUrl + '/schedules/posts/' + scope.post.get('id') + '?client_id=' + scope.client.get('slug') + '&client_secret=' + scope.client.get('secret'),
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
                        (err instanceof errors.IncorrectUsage).should.eql(true);
                        done();
                    });
            });
        });
    });
});
