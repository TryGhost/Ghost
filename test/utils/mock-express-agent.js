const http = require('http');

class MockExpressAgent {
    constructor({app, host}) {
        this.app = app;
        this.host = host || 'localhost';
    }

    buildRequestResponse({url, host, method = 'GET', secure = true}) {
        let req = new http.IncomingMessage();
        let res = new http.ServerResponse({
            method: method
        });

        res.end = function () {
            this.emit('finish');
        };

        req.connection = {
            encrypted: secure
        };

        req.method = 'GET';
        req.url = url;
        req.headers = {
            host: this.host
        };

        res.connection = {
            _httpMessage: res,
            writable: true,
            destroyed: false,
            cork: function () {},
            uncork: function () {},
            write: function () {},
            on: function () {}
        };

        return {req, res};
    }

    get(url) {
        const {req, res} = this.buildRequestResponse({
            url
        });
        const app = this.app;

        return new Promise(function (resolve) {
            res.send = res.end = function (body) {
                resolve({
                    err: res.req.err,
                    body: body,
                    statusCode: res.statusCode,
                    headers: res._headers,
                    req: req,
                    res: res
                });
            };

            app(req, res);
        });
    }
}

module.exports = MockExpressAgent;
