var should = require('should'),
    sinon = require('sinon'),
    config = require(__dirname + '/../../../../server/config'),
    moment = require('moment'),
    _ = require('lodash'),
    express = require('express'),
    bodyParser = require('body-parser'),
    http = require('http'),
    SchedulingDefault = require(config.get('paths').corePath + '/server/adapters/scheduling/SchedulingDefault'),

    sandbox = sinon.sandbox.create();

describe('Scheduling Default Adapter', function () {
    var scope = {};

    beforeEach(function () {
        scope.adapter = new SchedulingDefault();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('success', function () {
        it('addJob (schedule)', function () {
            sandbox.stub(scope.adapter, 'run');
            sandbox.stub(scope.adapter, '_execute');

            var dates = [
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

        it('run', function (done) {
            var timestamps = _.map(_.range(1000), function (i) {
                    return moment().add(i, 'seconds').valueOf();
                }),
                allJobs = {};

            sandbox.stub(scope.adapter, '_execute', function (nextJobs) {
                Object.keys(nextJobs).length.should.eql(182);
                Object.keys(scope.adapter.allJobs).length.should.eql(1000 - 182);
                done();
            });

            timestamps.forEach(function (timestamp) {
                allJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter.allJobs = allJobs;
            scope.adapter.runTimeoutInMs = 1000;
            scope.adapter.offsetInMinutes = 2;
            scope.adapter.run();
        });

        it('ensure recursive run works', function (done) {
            sandbox.spy(scope.adapter, '_execute');

            scope.adapter.allJobs = {};
            scope.adapter.runTimeoutInMs = 500;
            scope.adapter.offsetInMinutes = 2;
            scope.adapter.run();

            setTimeout(function () {
                scope.adapter._execute.callCount.should.be.greaterThan(1);
                done();
            }, 2000);
        });

        it('execute', function (done) {
            var pinged = 0,
                jobs = 3,
                timestamps = _.map(_.range(jobs), function (i) {
                    return moment().add(1, 'seconds').add(i * 100, 'milliseconds').valueOf();
                }),
                nextJobs = {};

            sandbox.stub(scope.adapter, 'run');
            sandbox.stub(scope.adapter, '_pingUrl', function () {
                pinged = pinged + 1;
            });

            timestamps.forEach(function (timestamp) {
                nextJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter._execute(nextJobs);

            (function retry() {
                if (pinged !== jobs) {
                    return setTimeout(retry, 100);
                }

                done();
            })();
        });

        it('delete job (unschedule)', function (done) {
            var pinged = 0,
                jobsToDelete = {},
                jobsToExecute = {};

            sandbox.stub(scope.adapter, 'run');
            sandbox.stub(scope.adapter, '_pingUrl', function () {
                pinged = pinged + 1;
            });

            // add jobs to delete
            jobsToDelete[moment().add(500, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToDelete[moment().add(550, 'milliseconds').valueOf()] = [{url: '/2', time: 1235}];
            jobsToDelete[moment().add(600, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToDelete[moment().add(650, 'milliseconds').valueOf()] = [{url: '/3', time: 1236}];

            _.map(jobsToDelete, function (value) {
                scope.adapter._deleteJob(value[0]);
            });

            // add jobs, which will be pinged
            jobsToExecute[moment().add(700, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(750, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(800, 'milliseconds').valueOf()] = [{url: '/1', time: 1234}];
            jobsToExecute[moment().add(850, 'milliseconds').valueOf()] = [{url: '/4', time: 1237}];

            // simulate execute is called
            scope.adapter._execute(jobsToExecute);

            (function retry() {
                if (pinged !== 2) {
                    return setTimeout(retry, 100);
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

        it('pingUrl (PUT)', function (done) {
            var app = express(),
                server = http.createServer(app),
                wasPinged = false,
                reqBody;

            app.use(bodyParser.json());

            app.put('/ping', function (req, res) {
                wasPinged = true;
                reqBody = req.body;
                res.sendStatus(200);
            });

            server.listen(1111);

            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().add(1, 'second').valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            (function retry() {
                if (wasPinged) {
                    should.not.exist(reqBody.force);
                    return server.close(done);
                }

                setTimeout(retry, 100);
            })();
        });

        it('pingUrl (GET)', function (done) {
            var app = express(),
                server = http.createServer(app),
                wasPinged = false,
                reqQuery;

            app.get('/ping', function (req, res) {
                wasPinged = true;
                reqQuery = req.query;
                res.sendStatus(200);
            });

            server.listen(1111);

            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().add(1, 'second').valueOf(),
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (wasPinged) {
                    should.not.exist(reqQuery.force);
                    return server.close(done);
                }

                setTimeout(retry, 100);
            })();
        });

        it('pingUrl (PUT, and detect publish in the past)', function (done) {
            var app = express(),
                server = http.createServer(app),
                wasPinged = false,
                reqBody;

            app.use(bodyParser.json());

            app.put('/ping', function (req, res) {
                wasPinged = true;
                reqBody = req.body;
                res.sendStatus(200);
            });

            server.listen(1111);

            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().subtract(10, 'minutes').valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            (function retry() {
                if (wasPinged) {
                    should.exist(reqBody.force);
                    return server.close(done);
                }

                setTimeout(retry, 100);
            })();
        });

        it('pingUrl (GET, and detect publish in the past)', function (done) {
            var app = express(),
                server = http.createServer(app),
                wasPinged = false,
                reqQuery;

            app.get('/ping', function (req, res) {
                wasPinged = true;
                reqQuery = req.query;
                res.sendStatus(200);
            });

            server.listen(1111);

            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().subtract(10, 'minutes').valueOf(),
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (wasPinged) {
                    should.exist(reqQuery.force);
                    return server.close(done);
                }

                setTimeout(retry, 100);
            })();
        });

        it('pingUrl, but blog returns 503', function (done) {
            var app = express(),
                server = http.createServer(app),
                returned500Count = 0,
                returned200 = false,
                reqBody;

            scope.adapter.retryTimeoutInMs = 200;

            app.use(bodyParser.json());
            app.put('/ping', function (req, res) {
                reqBody = req.body;

                if (returned500Count === 5) {
                    returned200 = true;
                    return res.sendStatus(200);
                }

                returned500Count = returned500Count + 1;
                res.sendStatus(503);
            });

            server.listen(1111);

            scope.adapter._pingUrl({
                url: 'http://localhost:1111/ping',
                time: moment().valueOf(),
                extra: {
                    httpMethod: 'PUT'
                }
            });

            (function retry() {
                if (returned200) {
                    should.exist(reqBody.force);
                    return server.close(done);
                }

                setTimeout(retry, 100);
            })();
        });
    });
});
