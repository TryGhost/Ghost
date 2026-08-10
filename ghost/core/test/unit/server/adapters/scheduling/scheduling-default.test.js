const assert = require('node:assert/strict');
const sinon = require('sinon');
const moment = require('moment');
const _ = require('lodash');
const logging = require('@tryghost/logging');
const SchedulingDefault = require('../../../../../core/server/adapters/scheduling/scheduling-default').default;

describe('Scheduling Default Adapter', function () {
    const scope = {};

    beforeEach(function () {
        scope.adapter = new SchedulingDefault();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('success', function () {
        // The fake-timer tests below use clock.tick() to step Ghost's
        // setTimeout-driven scheduler; install fake timers here only so the
        // sibling pingUrl group doesn't see them.
        /** @type {import('sinon').SinonFakeTimers} */
        let clock;
        beforeEach(function () {
            clock = sinon.useFakeTimers({shouldAdvanceTime: true});
        });

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
            assert.equal(scope.adapter.allJobs[moment(dates[1]).valueOf()], undefined);
            assert.equal(scope.adapter.allJobs[moment(dates[7]).valueOf()], undefined);
            sinon.assert.calledTwice(scope.adapter._execute);

            assert.equal(Object.keys(scope.adapter.allJobs).length, dates.length - 2);
            assert.deepEqual(Object.keys(scope.adapter.allJobs), [
                moment(dates[2]).valueOf().toString(),
                moment(dates[6]).valueOf().toString(),
                moment(dates[4]).valueOf().toString(),
                moment(dates[5]).valueOf().toString(),
                moment(dates[3]).valueOf().toString(),
                moment(dates[0]).valueOf().toString()
            ]);
        });

        it('reschedule: default', function () {
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

            clock.tick(50);

            sinon.assert.calledOnce(scope.adapter._pingUrl);
        });

        it('reschedule: simulate restart', function () {
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

            clock.tick(50);
            sinon.assert.calledOnce(scope.adapter._pingUrl);
        });

        it('run', function () {
            // 1000 jobs, but only the number x are under 1 minute
            const timestamps = _.map(_.range(1000), function (i) {
                return moment().add(i, 'seconds').valueOf();
            });

            const allJobs = {};

            timestamps.forEach(function (timestamp) {
                allJobs[timestamp] = [{url: 'xxx'}];
            });

            const executeStub = sinon.stub(scope.adapter, '_execute');

            scope.adapter.allJobs = allJobs;
            scope.adapter.runTimeoutInMs = 100;
            scope.adapter.offsetInMinutes = 1;
            scope.adapter.run();

            // run() reschedules itself every runTimeoutInMs; advancing the
            // clock by a single interval fires exactly one _execute.
            clock.tick(100);

            sinon.assert.calledOnce(executeStub);
            const nextJobs = executeStub.firstCall.args[0];
            assert.equal(Object.keys(nextJobs).length, 121);
            assert.equal(Object.keys(scope.adapter.allJobs).length, 1000 - 121);
        });

        it('ensure recursive run works', function () {
            sinon.spy(scope.adapter, '_execute');

            scope.adapter.allJobs = {};
            scope.adapter.runTimeoutInMs = 10;
            scope.adapter.offsetInMinutes = 1;
            scope.adapter.run();

            clock.tick(200);

            assert(scope.adapter._execute.callCount > 1);
        });

        it('execute', function () {
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

            // _execute arms a setTimeout (+ setImmediate) per job; step the
            // fake clock until every job has pinged.
            for (let i = 0; i < 200 && pinged !== jobs; i = i + 1) {
                clock.tick(50);
            }

            assert.equal(pinged, jobs);
        });

        it('delete job (unschedule)', function () {
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

            // 2 of the 4 jobs were unscheduled, so only 2 should ping.
            for (let i = 0; i < 200 && pinged !== 2; i = i + 1) {
                clock.tick(50);
            }

            assert.equal(Object.keys(scope.adapter.deletedJobs).length, 2);
            assert.equal(pinged, 2);
        });

        it('delete job (unschedule): time is null', function () {
            scope.adapter._deleteJob({time: null, url: '/test'});
            assert.equal(Object.keys(scope.adapter.deletedJobs).length, 0);
        });
    });

    describe('pingUrl', function () {
        // _pingUrl wraps `@tryghost/request` (got + cacheable-lookup, with
        // the cacheable-lookup instance held as a process-wide singleton).
        // Earlier versions of these tests drove the real path through nock,
        // but under the shared isolate:false unit worker the singleton was
        // racy — the request occasionally never reached the interceptor and
        // the test hit vitest's 5s testTimeout. The adapter exposes the
        // HTTP client as `this.request` so we can swap it for a sync stub.
        let requestStub;
        beforeEach(function () {
            requestStub = sinon.stub().resolves({statusCode: 200});
            scope.adapter.request = requestStub;
        });

        it('pingUrl (PUT)', async function () {
            await scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().add(1, 'second').valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            sinon.assert.calledOnce(requestStub);
            const [url, options] = requestStub.firstCall.args;
            assert.equal(url, 'http://localhost:1111/ping');
            assert.equal(options.method, 'PUT');
            // not publishing in the past — no force flag added
            assert.equal(options.searchParams, undefined);
            assert.equal(options.json, undefined);
        });

        it('pingUrl (GET)', async function () {
            await scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().add(1, 'second').valueOf(),
                extra: {
                    httpMethod: 'GET'
                }
            });

            sinon.assert.calledOnce(requestStub);
            const [url, options] = requestStub.firstCall.args;
            assert.equal(url, 'http://localhost:1111/ping');
            assert.equal(options.method, 'GET');
            assert.equal(options.searchParams, undefined);
            assert.equal(options.json, undefined);
        });

        it('pingUrl (PUT, and detect publish in the past)', async function () {
            await scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().subtract(10, 'minutes').valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            sinon.assert.calledOnce(requestStub);
            const [url, options] = requestStub.firstCall.args;
            assert.equal(url, 'http://localhost:1111/ping');
            assert.equal(options.method, 'PUT');
            // publishing in the past with PUT — body carries the force flag
            assert.deepEqual(options.json, {force: true});
            assert.equal(options.searchParams, undefined);
        });

        it('pingUrl (GET, and detect publish in the past)', async function () {
            await scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().subtract(10, 'minutes').valueOf(),
                extra: {
                    httpMethod: 'GET'
                }
            });

            sinon.assert.calledOnce(requestStub);
            const [url, options] = requestStub.firstCall.args;
            assert.equal(url, 'http://localhost:1111/ping');
            assert.equal(options.method, 'GET');
            // publishing in the past with GET — force flag in query string
            assert.deepEqual(options.searchParams, {force: true});
            assert.equal(options.json, undefined);
        });

        it('pingUrl, but blog returns 503', async function () {
            scope.adapter.retryTimeoutInMs = 20;

            const loggingStub = sinon.stub(logging, 'error');
            const pingSpy = sinon.spy(scope.adapter, '_pingUrl');

            const rejection503 = Object.assign(new Error('Service Unavailable'), {statusCode: 503});
            // Two 503s in a row, then a success — exercises the retry path.
            requestStub.onCall(0).rejects(rejection503);
            requestStub.onCall(1).rejects(rejection503);
            requestStub.onCall(2).resolves({statusCode: 200});

            // Wait for the nth _pingUrl attempt to be made, then for the
            // promise it returned to settle.
            const settle = async (callIndex) => {
                for (let i = 0; i < 200 && pingSpy.callCount <= callIndex; i = i + 1) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 10);
                    });
                }
                await pingSpy.returnValues[callIndex];
            };

            // Initial attempt + two retries: each 503 schedules a retry
            // retryTimeoutInMs later, the third attempt succeeds.
            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            await settle(0);
            await settle(1);
            await settle(2);

            sinon.assert.calledThrice(requestStub);
            // Third call (the retry after both 503s) goes through with a
            // body force flag because the schedule time is now in the past.
            assert.deepEqual(requestStub.thirdCall.args[1].json, {force: true});
            sinon.assert.calledThrice(pingSpy);
            sinon.assert.calledTwice(loggingStub);
        });
    });
});
