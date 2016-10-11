var GhostPrettyStream = require('../../../server/logging/PrettyStream'),
    errors = require('../../../server/errors'),
    should = require('should');

should.equal(true, true);

describe('PrettyStream', function () {
    describe('short mode', function () {
        it('data.msg', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m Ghost starts now.\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 30,
                msg: 'Ghost starts now.'
            }));
        });

        it('data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m\n%\n \u001b[4mlevel:normal\u001b[24m\n\u001b[31mHey Jude!\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                err: new errors.GhostError({message: 'Hey Jude!'})
            }));
        });

        it('data.req && data.res', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m GET /test (200)\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 30,
                req: {
                    originalUrl: '/test',
                    method: 'GET',
                    body: {
                        a: 'b'
                    }
                },
                res: {
                    statusCode: 200
                }
            }));
        });

        it('data.req && data.res && data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m GET /test (400)\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                req: {
                    originalUrl: '/test',
                    method: 'GET',
                    body: {
                        a: 'b'
                    }
                },
                res: {
                    statusCode: 400
                },
                err: new errors.GhostError()
            }));
        });
    });

    describe('long mode', function () {
        it('data.msg', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m Ghost starts now.\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 30,
                msg: 'Ghost starts now.'
            }));
        });

        it('data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m\n%\n \u001b[4mlevel:normal\u001b[24m\n\u001b[31mHey Jude!\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                err: new errors.GhostError({message: 'Hey Jude!'})
            }));
        });

        it('data.req && data.res', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m GET /test (200)\n\u001b[90m\n\u001b[33mBODY\u001b[39m\n\u001b[32ma: \u001b[39mb\n\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 30,
                req: {
                    originalUrl: '/test',
                    method: 'GET',
                    body: {
                        a: 'b'
                    }
                },
                res: {
                    statusCode: 200
                }
            }));
        });

        it('data.req && data.res && data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m GET /test (400)\n\u001b[90m\n\u001b[33mBODY\u001b[39m\n\u001b[32ma: \u001b[39mb\n\u001b[33mERROR (normal)\u001b[39m\n\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                req: {
                    originalUrl: '/test',
                    method: 'GET',
                    body: {
                        a: 'b'
                    }
                },
                res: {
                    statusCode: 400
                },
                err: new errors.GhostError()
            }));
        });
    });
});
