const assert = require('assert/strict');
const http = require('http');
const request = require('supertest');
const vhost = require('..');

describe('vhost(hostname, server)', function () {
    it('should route by Host', function (done) {
        const vhosts = [];

        vhosts.push(vhost('tobi.com', tobi));
        vhosts.push(vhost('loki.com', loki));

        const app = createServer(vhosts);

        function tobi(req, res) {
            res.end('tobi');
        }
        function loki(req, res) {
            res.end('loki');
        }

        request(app)
            .get('/')
            .set('Host', 'tobi.com')
            .expect(200, 'tobi', done);
    });

    it('should route by `req.hostname` (express v4)', function (done) {
        const vhosts = [];

        vhosts.push(vhost('anotherhost.com', anotherhost));
        vhosts.push(vhost('loki.com', loki));

        const app = createServer(vhosts, null, function (req) {
            // simulate express setting req.hostname based on x-forwarded-host
            req.hostname = 'anotherhost.com';
        });

        function anotherhost(req, res) {
            res.end('anotherhost');
        }
        function loki(req, res) {
            res.end('loki');
        }

        request(app)
            .get('/')
            .set('Host', 'loki.com')
            .expect(200, 'anotherhost', done);
    });

    it('should ignore port in Host', function (done) {
        const app = createServer('tobi.com', function (req, res) {
            res.end('tobi');
        });

        request(app)
            .get('/')
            .set('Host', 'tobi.com:8080')
            .expect(200, 'tobi', done);
    });

    it('should support IPv6 literal in Host', function (done) {
        const app = createServer('[::1]', function (req, res) {
            res.end('loopback');
        });

        request(app)
            .get('/')
            .set('Host', '[::1]:8080')
            .expect(200, 'loopback', done);
    });

    it('should 404 unless matched', function (done) {
        const vhosts = [];

        vhosts.push(vhost('tobi.com', tobi));
        vhosts.push(vhost('loki.com', loki));

        const app = createServer(vhosts);

        function tobi(req, res) {
            res.end('tobi');
        }
        function loki(req, res) {
            res.end('loki');
        }

        request(app)
            .get('/')
            .set('Host', 'ferrets.com')
            .expect(404, done);
    });

    it('should 404 without Host header', function (done) {
        const vhosts = [];

        vhosts.push(vhost('tobi.com', tobi));
        vhosts.push(vhost('loki.com', loki));

        const server = createServer(vhosts);
        const listeners = server.listeners('request');

        server.removeAllListeners('request');
        listeners.unshift(function (req) {
            req.headers.host = undefined;
        });
        listeners.forEach(function (l) {
            server.addListener('request', l);
        });

        function tobi(req, res) {
            res.end('tobi');
        }
        function loki(req, res) {
            res.end('loki');
        }

        request(server)
            .get('/')
            .expect(404, 'no vhost for "undefined"', done);
    });

    describe('arguments', function () {
        describe('hostname', function () {
            it('should be required', function () {
                assert.throws(vhost.bind(), /hostname.*required/);
            });

            it('should accept string', function () {
                assert.doesNotThrow(vhost.bind(null, 'loki.com', function () {}));
            });

            it('should accept RegExp', function () {
                assert.doesNotThrow(vhost.bind(null, /loki\.com/, function () {}));
            });
        });

        describe('handle', function () {
            it('should be required', function () {
                assert.throws(vhost.bind(null, 'loki.com'), /handle.*required/);
            });

            it('should accept function', function () {
                assert.doesNotThrow(vhost.bind(null, 'loki.com', function () {}));
            });

            it('should reject plain object', function () {
                assert.throws(vhost.bind(null, 'loki.com', {}), /handle.*function/);
            });
        });
    });

    describe('with string hostname', function () {
        it('should support wildcards', function (done) {
            const app = createServer('*.ferrets.com', function (req, res) {
                res.end('wildcard!');
            });

            request(app)
                .get('/')
                .set('Host', 'loki.ferrets.com')
                .expect(200, 'wildcard!', done);
        });

        it('should restrict wildcards to single part', function (done) {
            const app = createServer('*.ferrets.com', function (req, res) {
                res.end('wildcard!');
            });

            request(app)
                .get('/')
                .set('Host', 'foo.loki.ferrets.com')
                .expect(404, done);
        });

        it('should treat dot as a dot', function (done) {
            const app = createServer('a.b.com', function (req, res) {
                res.end('tobi');
            });

            request(app)
                .get('/')
                .set('Host', 'aXb.com')
                .expect(404, done);
        });

        it('should match entire string', function (done) {
            const app = createServer('.com', function (req, res) {
                res.end('commercial');
            });

            request(app)
                .get('/')
                .set('Host', 'foo.com')
                .expect(404, done);
        });

        it('should populate req.vhost', function (done) {
            const app = createServer('user-*.*.com', function (req, res) {
                const keys = Object.keys(req.vhost).sort();
                const arr = keys.map(function (k) {
                    return [k, req.vhost[k]];
                });
                res.end(JSON.stringify(arr));
            });

            request(app)
                .get('/')
                .set('Host', 'user-bob.foo.com:8080')
                .expect(200, '[["0","bob"],["1","foo"],["host","user-bob.foo.com:8080"],["hostname","user-bob.foo.com"],["length",2]]', done);
        });
    });

    describe('with RegExp hostname', function () {
        it('should match using RegExp', function (done) {
            const app = createServer(/[tl]o[bk]i\.com/, function (req, res) {
                res.end('tobi');
            });

            request(app)
                .get('/')
                .set('Host', 'toki.com')
                .expect(200, 'tobi', done);
        });

        it('should match entire hostname', function (done) {
            const vhosts = [];

            vhosts.push(vhost(/\.tobi$/, tobi));
            vhosts.push(vhost(/^loki\./, loki));

            const app = createServer(vhosts);

            function tobi(req, res) {
                res.end('tobi');
            }
            function loki(req, res) {
                res.end('loki');
            }

            request(app)
                .get('/')
                .set('Host', 'loki.tobi.com')
                .expect(404, done);
        });

        it('should populate req.vhost', function (done) {
            const app = createServer(/user-(bob|joe)\.([^.]+)\.com/, function (req, res) {
                const keys = Object.keys(req.vhost).sort();
                const arr = keys.map(function (k) {
                    return [k, req.vhost[k]];
                });
                res.end(JSON.stringify(arr));
            });

            request(app)
                .get('/')
                .set('Host', 'user-bob.foo.com:8080')
                .expect(200, '[["0","bob"],["1","foo"],["host","user-bob.foo.com:8080"],["hostname","user-bob.foo.com"],["length",2]]', done);
        });
    });
});

function createServer(hostname, server, pretest) {
    const vhosts = !Array.isArray(hostname)
        ? [vhost(hostname, server)]
        : hostname;

    return http.createServer(function onRequest(req, res) {
        // This allows you to perform changes to the request/response
        // objects before our assertions
        if (pretest) {
            pretest(req, res);
        }

        let index = 0;
        function next(err) {
            const foundVhost = vhosts[index];
            index = index + 1;

            if (!foundVhost || err) {
                res.statusCode = err ? (err.status || 500) : 404;
                res.end(err ? err.message : `no vhost for "${req.headers.host}"`);
                return;
            }

            foundVhost(req, res, next);
        }

        next();
    });
}
