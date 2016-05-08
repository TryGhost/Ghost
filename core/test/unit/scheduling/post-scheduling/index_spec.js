/*globals describe, it, before, after, afterEach*/

var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    config = require(__dirname + '/../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    errors = require(config.paths.corePath + '/server/errors'),
    events = require(config.paths.corePath + '/server/events'),
    models = rewire(config.paths.corePath + '/server/models'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault');

models.init();

describe('Scheduling: Post Scheduling', function () {
    var scope = {
        events: {},
        scheduledPosts: [],
        apiUrl: 'localhost:1111/',
        client: models.Client.forge(testUtils.DataGenerator.forKnex.createClient({slug: 'ghost-scheduler'})),
        post: models.Post.forge(testUtils.DataGenerator.forKnex.createPost({id: 1337, markdown: 'something'}))
    };

    before(function () {
        scope.adapter = new SchedulingDefault();

        testUtils.mockNotExistingModule(/api\/schedules/, {
            getScheduledPosts: function () {
                return Promise.resolve({posts: scope.scheduledPosts});
            }
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

        scope.postScheduling = rewire(config.paths.corePath + '/server/scheduling/post-scheduling');
        scope.postScheduling.__set__('models', models);
        sinon.spy(scope.adapter, 'schedule');
    });

    afterEach(function () {
        scope.adapter.schedule.reset();
    });

    after(function () {
        schedulingUtils.createAdapter.restore();
        scope.adapter.schedule.restore();
        events.onMany.restore();
        testUtils.unmockNotExistingModule();
    });

    describe('fn:init', function () {
        describe('success', function () {
            it('will be scheduled', function (done) {
                scope.postScheduling.init({
                    apiUrl: scope.apiUrl,
                    postScheduling: {}
                }).then(function () {
                    scope.events['post.scheduled'](scope.post);
                    scope.adapter.schedule.called.should.eql(true);

                    scope.adapter.schedule.calledWith({
                        time: scope.post.get('published_at'),
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

                scope.postScheduling.init({
                    apiUrl: scope.apiUrl,
                    postScheduling: {}
                }).then(function () {
                    scope.adapter.schedule.calledTwice.should.eql(true);
                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('no url passed', function (done) {
                scope.postScheduling.init()
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.IncorrectUsage).should.eql(true);
                        done();
                    });
            });
        });
    });
});
