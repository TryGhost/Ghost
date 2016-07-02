var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    moment = require('moment'),
    rewire = require('rewire'),
    config = require(__dirname + '/../../../../server/config'),
    models = require(config.paths.corePath + '/server/models'),
    events = require(config.paths.corePath + '/server/events'),
    SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    sandbox = sinon.sandbox.create();

describe('unit: newsletter-scheduling', function () {
    var scope = {
        apiUrl: 'http://scheduler.com'
    };

    before(function () {
        models.init();
    });

    beforeEach(function () {
        scope.rrule = {
            parseString: sandbox.stub()
        };

        scope.adapter = {
            reschedule: sandbox.stub(),
            run: sandbox.stub()
        };

        sandbox.stub(models.Client, 'findOne', function () {
            return Promise.resolve({
                get: function (attr) {
                    switch (attr) {
                        case 'slug':
                            return 'scheduler';
                            break;
                        case 'secret':
                            return 'a-secret';
                            break;
                        default:
                            break;
                    }
                }
            });
        });

        sandbox.stub(schedulingUtils, 'createAdapter', function () {
            return Promise.resolve(scope.adapter);
        });

        sandbox.stub(events, 'on');

        testUtils.mocks.utils.mockNotExistingModule(/server\/utils/, {
            rrule: scope.rrule
        });

        scope.newsletterScheduling = rewire(config.paths.corePath + '/server/scheduling/newsletter-scheduling');
    });

    afterEach(function () {
        sandbox.restore();
        testUtils.mocks.utils.unmockNotExistingModule();
    });

    it('newsletter was never executed', function (done) {
        var nextNewsletterDate = moment().add(2, 'days').toDate(),
            rruleInstance = {
                all: sandbox.stub().returns(nextNewsletterDate)
            };

        config.newsletter = {
            lastExecutedAt: null,
            rrule: 'some-rrule'
        };

        scope.rrule.parseString.returns(rruleInstance);

        scope.newsletterScheduling.init({
            apiUrl: scope.apiUrl
        }).then(function () {
            scope.adapter.run.calledOnce.should.eql(true);
            scope.adapter.reschedule.calledOnce.should.eql(true);
            events.on.callCount.should.eql(3);

            scope.adapter.reschedule.calledWith({
                time: nextNewsletterDate.valueOf(),
                url: scope.apiUrl + '/schedules/newsletter?client_id=scheduler&client_secret=a-secret',
                extra: {
                    httpMethod: 'PUT',
                    oldTime: null
                }
            }).should.eql(true);
            done();
        }).catch(done);
    });

    it('newsletter was already executed', function (done) {
        var previousNewsletterDate = moment().add(1, 'days').toDate(),
            nextNewsletterDate = moment().add(2, 'days').toDate(),
            rruleInstance = {
                all: sandbox.stub().returns([nextNewsletterDate])
            };

        config.newsletter = {
            lastExecutedAt: previousNewsletterDate.valueOf(),
            rrule: 'some-rrule'
        };

        scope.rrule.parseString.returns(rruleInstance);

        scope.newsletterScheduling.init({
            apiUrl: scope.apiUrl
        }).then(function () {
            scope.adapter.run.calledOnce.should.eql(true);
            scope.adapter.reschedule.calledOnce.should.eql(true);
            events.on.callCount.should.eql(3);

            scope.adapter.reschedule.calledWith({
                time: nextNewsletterDate.valueOf(),
                url: scope.apiUrl + '/schedules/newsletter?client_id=scheduler&client_secret=a-secret',
                extra: {
                    httpMethod: 'PUT',
                    oldTime: previousNewsletterDate.valueOf()
                }
            }).should.eql(true);
            done();
        }).catch(done);
    });
});
