const should = require('should');
const sinon = require('sinon');
const moment = require('moment');
const _ = require('lodash');
const nock = require('nock');
const SchedulingDefault = require('../../../../../core/server/adapters/scheduling/scheduling-default');
const logging = require('@tryghost/logging');

describe('Scheduling Default Adapter', function () {
    const scope = {};

    beforeEach(function () {
        scope.adapter = new SchedulingDefault();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('success', function () {
        it('addJob (schedule)', function () {
            sinon.stub(scope.adapter, 'run');
            sinon.stub(scope.adapter, '_execute');

            const dates = [
                moment().add(1, 'day').subtract(30, 'seconds').toDate(),
                moment().add(7, 'minutes').toDate(),

                // over 10minutes offset
                moment().add(12, 'minutes').toDate(),
                moment().add(20, 'minutes').toDate(),
                moment().add(15, 'minutes').toDate(),
                moment().add(15, 'minutes').add(10, 'seconds').toDate(),
                moment().add(15, 'minutes').subtract(30, 'seconds').toDate(),
                moment().add(50, 'seconds').toDate()
            ];

            dates.forEach(function (time) {
                scope.adapter._addJob({
                    time: time,
                    url: 'something'
                });
            });

            // 2 jobs get immediately executed
            should.not.exist(scope.adapter.allJobs[moment(dates[1]).valueOf()]);
            should.not.exist(scope.adapter.allJobs[moment(dates[7]).valueOf()]);
            scope.adapter._execute.calledTwice.should.eql(true);

            Object.keys(scope.adapter.allJobs).length.should.eql(dates.length - 2);
            Object.keys(scope.adapter.allJobs).should.eql([
                moment(dates[2]).valueOf().toString(),
                moment(dates[6]).valueOf().toString(),
                moment(dates[4]).valueOf().toString(),
                moment(dates[5]).valueOf().toString(),
                moment(dates[3]).valueOf().toString(),
                moment(dates[0]).valueOf().toString()
            ]);
        });

        it('reschedule: default', function (done) {
            sinon.stub(scope.adapter, '_pingUrl');

            const time = moment().add(20, 'milliseconds').valueOf();

            scope.adapter.schedule({
                time: time,
                url: 'something',
                extra: {
                    oldTime: null,
                    method: 'PUT'
                }
            });

            /**Reschedule is now unschedule+schedule */
            scope.adapter.unschedule({
                time: time,
                url: 'something',
                extra: {
                    oldTime: time,
                    method: 'PUT'
                }
            });
            scope.adapter.schedule({
                time: time,
                url: 'something',
                extra: {
                    oldTime: null,
                    method: 'PUT'
                }
            });

            setTimeout(() => {
                scope.adapter._pingUrl.calledOnce.should.eql(true);
                done();
            }, 50);
        });

        it('reschedule: simulate restart', function (done) {
            sinon.stub(scope.adapter, '_pingUrl');

            const time = moment().add(20, 'milliseconds').valueOf();

            scope.adapter.unschedule({
                time: time,
                url: 'something',
                extra: {
                    oldTime: time,
                    method: 'PUT'
                }
            }, {bootstrap: true});

            scope.adapter.schedule({
                time: time,
                url: 'something',
                extra: {
                    oldTime: null,
                    method: 'PUT'
                }
            });

            setTimeout(() => {
                scope.adapter._pingUrl.calledOnce.should.eql(true);
                done();
            }, 50);
        });

        it('run', function (done) {
            // 1000 jobs, but only the number x are under 1 minute
            const timestamps = _.map(_.range(1000), function (i) {
                return moment().add(i, 'seconds').valueOf();
            });

            const allJobs = {};

            sinon.stub(scope.adapter, '_execute').callsFake(function (nextJobs) {
                Object.keys(nextJobs).length.should.eql(121);
                Object.keys(scope.adapter.allJobs).length.should.eql(1000 - 121);
                done();
            });

            timestamps.forEach(function (timestamp) {
                allJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter.allJobs = allJobs;
            scope.adapter.runTimeoutInMs = 100;
            scope.adapter.offsetInMinutes = 1;
            scope.adapter.run();
        });

        it('ensure recursive run works', function (done) {
            sinon.spy(scope.adapter, '_execute');

            scope.adapter.allJobs = {};
            scope.adapter.runTimeoutInMs = 10;
            scope.adapter.offsetInMinutes = 1;
            scope.adapter.run();

            setTimeout(function () {
                scope.adapter._execute.callCount.should.be.greaterThan(1);
                done();
            }, 200);
        });

        it('execute', function (done) {
            let pinged = 0;
            const jobs = 3;

            const timestamps = _.map(_.range(jobs), function (i) {
                return moment().add(i * 50, 'milliseconds').valueOf();
            });

            const nextJobs = {};

            sinon.stub(scope.adapter, 'run');
            sinon.stub(scope.adapter, '_pingUrl').callsFake(function () {
                pinged = pinged + 1;
            });

            timestamps.forEach(function (timestamp) {
                nextJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter._execute(nextJobs);

            (function retry() {
                if (pinged !== jobs) {
                    return setTimeout(retry, 50);
                }

                done();
            })();
        });

        it('delete job (unschedule)', function (done) {
            let pinged = 0;
            const jobsToDelete = {};
            const jobsToExecute = {};

            sinon.stub(scope.adapter, 'run');
            sinon.stub(scope.adapter, '_pingUrl').callsFake(function () {
                pinged = pinged + 1;
            });

            // add jobs to delete
            jobsToDelete[moment().add(10, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToDelete[moment().add(20, 'milliseconds').valueOf()] = [{url: '/2', time: 1235}];
            jobsToDelete[moment().add(30, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToDelete[moment().add(40, 'milliseconds').valueOf()] = [{url: '/3', time: 1236}];

            _.map(jobsToDelete, function (value) {
                scope.adapter._deleteJob(value[0]);
            });

            // add jobs, which will be pinged
            jobsToExecute[moment().add(50, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(60, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(70, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(80, 'milliseconds').valueOf()] = [{url: '/4', time: 1237}];

            // simulate execute is called
            scope.adapter._execute(jobsToExecute);

            (function retry() {
                if (pinged !== 2) {
                    return setTimeout(retry, 50);
                }

                Object.keys(scope.adapter.deletedJobs).length.should.eql(2);
                pinged.should.eql(2);
                done();
            })();
        });

        it('delete job (unschedule): time is null', function () {
            scope.adapter._deleteJob({time: null, url: '/test'});
            Object.keys(scope.adapter.deletedJobs).length.should.eql(0);
        });

        describe('pingUrl', function () {
            it('pingUrl (PUT)', function (done) {
                const ping = nock('http://localhost:1111')
                    .put('/ping')
                    .query({})
                    .reply(200);

                scope.adapter._pingUrl({
                    url: 'http://localhost:1111/ping',
                    time: moment().add(1, 'second').valueOf(),
                    extra: {
                        httpMethod: 'PUT'
                    }
                });

                (function retry() {
                    if (ping.isDone()) {
                        done();
                    } else {
                        setTimeout(retry, 100);
                    }
                })();
            });

            it('pingUrl (GET)', async function () {
                const ping = nock('http://localhost:1111')
                    .get('/ping')
                    .query({})
                    .reply(200);

                await scope.adapter._pingUrl({
                    url: 'http://localhost:1111/ping',
                    time: moment().add(1, 'second').valueOf(),
                    extra: {
                        httpMethod: 'GET'
                    }
                });

                ping.isDone().should.be.true();
            });

            it('pingUrl (PUT, and detect publish in the past)', async function () {
                const ping = nock('http://localhost:1111')
                    .put('/ping')
                    .query({})
                    .reply(200);

                await scope.adapter._pingUrl({
                    url: 'http://localhost:1111/ping',
                    time: moment().subtract(10, 'minutes').valueOf(),
                    extra: {
                        httpMethod: 'PUT'
                    }
                });

                ping.isDone().should.be.true();
            });

            it('pingUrl (GET, and detect publish in the past)', async function () {
                const ping = nock('http://localhost:1111')
                    .get('/ping')
                    .query({force: true})
                    .reply(200);

                await scope.adapter._pingUrl({
                    url: 'http://localhost:1111/ping',
                    time: moment().subtract(10, 'minutes').valueOf(),
                    extra: {
                        httpMethod: 'GET'
                    }
                });

                ping.isDone().should.be.true();
            });

            it('pingUrl, but blog returns 503', function (done) {
                scope.adapter.retryTimeoutInMs = 50;

                const loggingStub = sinon.stub(logging, 'error');

                const ping = nock('http://localhost:1111')
                    .put('/ping').reply(503)
                    .put('/ping').reply(503)
                    .put('/ping', {force: true}).reply(200);

                scope.adapter._pingUrl({
                    url: 'http://localhost:1111/ping',
                    time: moment().valueOf(),
                    extra: {
                        httpMethod: 'PUT'
                    }
                });

                (function retry() {
                    if (ping.isDone()) {
                        sinon.assert.calledTwice(loggingStub);
                        return done();
                    }

                    setTimeout(retry, 50);
                }());
            });
        });
    });
});
