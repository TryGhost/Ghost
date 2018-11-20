const http = require('http');
const got = require('got');
const jwt = require('jsonwebtoken');
const should = require('should');
const MembersApi = require('../../../server/lib/members');

describe('MembersApi lib', function () {
    it('exports a function', function () {
        should.equal(typeof MembersApi, 'function');
    });

    describe('MembersApi()', function () {
        it('returns a function', function () {
            should.equal(typeof MembersApi(), 'function');
        });

        describe('HTTP requests', function () {
            let apiUrl;
            before(function (done) {
                const api = MembersApi();
                const server = http.createServer(api);
                server.listen(0, '0.0.0.0', () => {
                    const {address, port} = server.address();
                    apiUrl = `http://${address}:${port}`;
                    done();
                });
                after(function (done) {
                    server.close(() => done());
                });
            });

            it('handles POST /secure/token and returns jwt', function () {
                return got(`${apiUrl}/secure/token`, {method: 'post'})
                    .then(response => {
                        should.exist(response.body);
                        should.exist(jwt.decode(response.body));
                    });
            });
        });
    });
});
