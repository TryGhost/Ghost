var GhostPrettyStream = require('../../../server/logging/PrettyStream'),
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
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m\n\u001b[31m\n\u001b[31mHey Jude!\u001b[39m\n\u001b[37mstack\u001b[39m\n\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                err: {
                    message: 'Hey Jude!',
                    stack: 'stack'
                }
            }));
        });

        it('data.req && data.res', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('\u001b[36mINFO\u001b[39m [2016-07-01 00:00:00] "GET /test" 200 39ms\n');
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
                    statusCode: 200,
                    responseTime: '39ms'
                }
            }));
        });

        it('data.req && data.res && data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'short'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('\u001b[31mERROR\u001b[39m [2016-07-01 00:00:00] "GET /test" 400 39ms\n\u001b[31m\n\u001b[31mmessage\u001b[39m\n\u001b[37mstack\u001b[39m\n\u001b[39m\n');
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
                    statusCode: 400,
                    responseTime: '39ms'
                },
                err: {
                    message: 'message',
                    stack: 'stack'
                }
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
                data.should.eql('[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m\n\u001b[31m\n\u001b[31mHey Jude!\u001b[39m\n\u001b[37mstack\u001b[39m\n\u001b[39m\n\u001b[90m\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 50,
                err: {
                    message: 'Hey Jude!',
                    stack: 'stack'
                }
            }));
        });

        it('data.req && data.res', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('\u001b[36mINFO\u001b[39m [2016-07-01 00:00:00] "GET /test" 200 39ms\n\u001b[90m\n\u001b[33mREQ\u001b[39m\n\u001b[32mip: \u001b[39m         127.0.01\n\u001b[32moriginalUrl: \u001b[39m/test\n\u001b[32mmethod: \u001b[39m     GET\n\u001b[32mbody: \u001b[39m\n  \u001b[32ma: \u001b[39mb\n\n\u001b[33mRES\u001b[39m\n\u001b[32mresponseTime: \u001b[39m39ms\n\u001b[39m\n');
                done();
            };

            ghostPrettyStream.write(JSON.stringify({
                time: '2016-07-01 00:00:00',
                level: 30,
                req: {
                    ip: '127.0.01',
                    originalUrl: '/test',
                    method: 'GET',
                    body: {
                        a: 'b'
                    }
                },
                res: {
                    statusCode: 200,
                    responseTime: '39ms'
                }
            }));
        });

        it('data.req && data.res && data.err', function (done) {
            var ghostPrettyStream = new GhostPrettyStream({mode: 'long'});

            ghostPrettyStream.emit = function (eventName, data) {
                data.should.eql('\u001b[31mERROR\u001b[39m [2016-07-01 00:00:00] "GET /test" 400 39ms\n\u001b[31m\n\u001b[31mHey Jude!\u001b[39m\n\u001b[37mstack\u001b[39m\n\u001b[39m\n\u001b[90m\n\u001b[33mREQ\u001b[39m\n\u001b[32moriginalUrl: \u001b[39m/test\n\u001b[32mmethod: \u001b[39m     GET\n\u001b[32mbody: \u001b[39m\n  \u001b[32ma: \u001b[39mb\n\n\u001b[33mRES\u001b[39m\n\u001b[32mresponseTime: \u001b[39m39ms\n\u001b[39m\n');
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
                    statusCode: 400,
                    responseTime: '39ms'
                },
                err: {
                    message: 'Hey Jude!',
                    stack: 'stack'
                }
            }));
        });
    });
});
