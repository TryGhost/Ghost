const http = require('http');
// const express = require('express');
class MockExpressAgent {
    constructor({app, host, urlPrefix}) {
        this.app = app;
        this.host = host || 'localhost';
        this.urlPrefix = urlPrefix;
    }

    jsonResponse(body, res) {
        if (res.headers) {
            res.setHeader('content-type', 'application/json; charset=utf-8');
        }
        res.setHeader('Content-Length', Buffer.byteLength(body));

        return JSON.parse(body);
    }

    buildRequestResponse({url, host, method = 'GET', secure = true}) {
        let req = new http.IncomingMessage();
        let res = new http.ServerResponse({
            method: method
        });

        // THIS needs a better patch for CORS headers to start working
        res.end = function () {
            this.emit('finish');
        };

        req.connection = {
            encrypted: secure
        };

        req.method = 'GET';

        if (this.urlPrefix) {
            req.url = this.urlPrefix + url;
        } else {
            req.url = url;
        }

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
        const jsonResponse = this.jsonResponse;

        return new Promise(function (resolve) {
            res.send = res.end = function (body) {
                const parsedBody = jsonResponse(body, res);

                resolve({
                    err: res.req.err,
                    body: parsedBody,
                    statusCode: res.statusCode,
                    headers: res.getHeaders(),
                    req: req,
                    res: res
                });
            };

            app(req, res);
        });
    }
}

module.exports = MockExpressAgent;
