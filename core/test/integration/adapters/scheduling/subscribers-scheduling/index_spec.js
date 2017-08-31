var sinon = require('sinon'),
    Promise = require('bluebird'),
    should = require('should'),
    moment = require('moment'),
    rewire = require('rewire'),
    events = require('../../../../../server/events'),
    subscribersScheduler = rewire('../../../../../server/adapters/scheduling/subscribers-scheduling'),
    schedulingUtils = require('../../../../../server/adapters/scheduling/utils'),
    settingsCache = require('../../../../../server/settings/cache'),
    models = require('../../../../../server/models'),
    testUtils = require('../../../../utils'),
    sandbox = sinon.sandbox.create();

should.equal(true, true);

describe('Subscribers Scheduler', function () {
    var adapterStub, clientStub, apiUrl = 'http://example.ghost.org', localEvents = {};

    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('settings'));

    beforeEach(function () {
        adapterStub = sandbox.stub();
        adapterStub.run = sandbox.spy();
        adapterStub.schedule = sandbox.spy();
        adapterStub.reschedule = sandbox.spy();
        adapterStub._deleteJob = sandbox.spy();

        clientStub = sandbox.stub();
        clientStub.get = sandbox.stub();
        clientStub.get.withArgs('slug').returns('ghost-scheduler');
        clientStub.get.withArgs('secret').returns('secret');

        sandbox.stub(schedulingUtils, 'createAdapter').returns(adapterStub);
        sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(clientStub));

        sandbox.stub(events, 'on', function (key, cb) {
            localEvents[key] = cb;
        });

        sandbox.stub(events, 'emit', function (key, data, options) {
            if (!localEvents[key]) {
                return;
            }

            localEvents[key](data, options);
        });
    });

    afterEach(function () {
        sandbox.restore();
        settingsCache.set('mailchimp', undefined);
        settingsCache.set('scheduling', undefined);
    });

    it('[bootstrap] app is deactivated', function () {
        settingsCache.set('mailchimp', {value: {isActive: false}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(false);
                adapterStub._deleteJob.calledOnce.should.eql(false);
            });
    });

    it('[bootstrap] app is activated', function () {
        var nextSyncAt = moment().add(24, 'hours').valueOf();

        settingsCache.set('mailchimp', {value: {isActive: true}});
        settingsCache.set('scheduling', {value: {subscribers: {nextSyncAt: nextSyncAt}}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub.reschedule.getCall(0).args[0].should.eql({
                    time: nextSyncAt,
                    url: 'http://example.ghost.org/schedules/subscribers/sync?client_id=ghost-scheduler&client_secret=secret',
                    extra: {
                        httpMethod: 'GET',
                        oldTime: undefined,
                        timeoutInMS: 300000
                    }
                });
                adapterStub._deleteJob.calledOnce.should.eql(false);
            });
    });

    it('[bootstrap] app is activated, nextSyncAt was never set', function () {
        var nextSyncAt = '';

        settingsCache.set('mailchimp', {value: {isActive: true}});
        settingsCache.set('scheduling', {value: {subscribers: {nextSyncAt: nextSyncAt}}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub.reschedule.getCall(0).args[0].should.eql({
                    time: 1504166713386,
                    url: 'http://example.ghost.org/schedules/subscribers/sync?client_id=ghost-scheduler&client_secret=secret',
                    extra: {
                        httpMethod: 'GET',
                        oldTime: undefined,
                        timeoutInMS: 300000
                    }
                });
                adapterStub._deleteJob.calledOnce.should.eql(false);
            });
    });

    it('[events] sync completed, app was deactivated in the meantime', function () {
        settingsCache.set('mailchimp', {value: {isActive: false}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                return models.Settings.edit([{
                    key: 'scheduling',
                    value: JSON.stringify({subscribers: {nextSyncAt: moment().add(24, 'hours')}})
                }], testUtils.context.internal);
            })
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.called.should.eql(false);
                adapterStub._deleteJob.called.should.eql(false);
            });
    });

    it('[events] sync completed', function () {
        var nextSyncAt = moment().add(24, 'hours').valueOf();
        settingsCache.set('mailchimp', {value: {isActive: true}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub._deleteJob.called.should.eql(false);
                adapterStub.reschedule.reset();
                adapterStub.run.reset();

                return models.Settings.edit([{
                    key: 'scheduling',
                    value: JSON.stringify({subscribers: {nextSyncAt: nextSyncAt}})
                }], testUtils.context.internal);
            })
            .then(function () {
                adapterStub.run.called.should.eql(false);
                adapterStub.schedule.calledOnce.should.eql(true);
                adapterStub.schedule.getCall(0).args[0].should.eql({
                    time: nextSyncAt,
                    url: 'http://example.ghost.org/schedules/subscribers/sync?client_id=ghost-scheduler&client_secret=secret',
                    extra: {
                        httpMethod: 'GET',
                        oldTime: undefined,
                        timeoutInMS: 300000
                    }
                });
                adapterStub.reschedule.called.should.eql(false);
                adapterStub._deleteJob.called.should.eql(false);
            });
    });

    it('[events] subscriber was added via admin/frontend', function () {
        settingsCache.set('mailchimp', {value: {isActive: true}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub._deleteJob.called.should.eql(false);
                adapterStub.reschedule.reset();
                adapterStub.run.reset();

                return models.Subscriber.add({
                    email: 'test@ghost.org',
                    status: 'subscribed'
                }, testUtils.context.admin);
            })
            .then(function () {
                adapterStub.run.called.should.eql(false);
                adapterStub.schedule.calledOnce.should.eql(true);
                adapterStub.schedule.getCall(0).args[0].should.eql({
                    time: 1504166713386,
                    url: 'http://example.ghost.org/schedules/subscribers/add/test@ghost.org?client_id=ghost-scheduler&client_secret=secret',
                    extra: {
                        httpMethod: 'POST',
                        oldTime: undefined,
                        timeoutInMS: 300000
                    }
                });
                adapterStub.reschedule.called.should.eql(false);
                adapterStub._deleteJob.called.should.eql(false);
            });
    });

    it('[events] subscriber was added via internal request', function () {
        settingsCache.set('mailchimp', {value: {isActive: true}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub._deleteJob.called.should.eql(false);
                adapterStub.reschedule.reset();
                adapterStub.run.reset();

                return models.Subscriber.add({
                    email: 'test@ghost.org',
                    status: 'subscribed'
                }, testUtils.context.internal);
            })
            .then(function () {
                adapterStub.run.called.should.eql(false);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.called.should.eql(false);
                adapterStub._deleteJob.called.should.eql(false);
            });
    });

    it('[events] mailchimp settings change', function () {
        settingsCache.set('mailchimp', {value: {isActive: true}});

        return subscribersScheduler.init({apiUrl: apiUrl})
            .then(function () {
                adapterStub.run.calledOnce.should.eql(true);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.calledOnce.should.eql(true);
                adapterStub._deleteJob.called.should.eql(false);
                adapterStub.reschedule.reset();
                adapterStub.run.reset();

                return models.Subscriber.add({
                    email: 'test@ghost.org',
                    status: 'subscribed'
                }, testUtils.context.internal);
            })
            .then(function () {
                adapterStub.run.called.should.eql(false);
                adapterStub.schedule.called.should.eql(false);
                adapterStub.reschedule.called.should.eql(false);
                adapterStub._deleteJob.called.should.eql(false);
            });
    });
});
