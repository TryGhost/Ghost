'use strict';

const _ = require('lodash');
const http = require('http');

module.exports = {
    invoke: function (app, reqParams) {
        let req = new http.IncomingMessage();
        let res = new http.ServerResponse({
            method: reqParams.method
        });

        req.connection = {
            encrypted: reqParams.secure
        };

        req.method = 'GET';
        req.url = reqParams.url;
        req.headers = {
            host: reqParams.host
        };

        // @TODO: how to get a mocked connection
        res.connection = {
            _httpMessage: res,
            writable: true,
            destroyed: false,
            cork: function () {
            },
            uncork: function () {
            },
            write: function () {
            }
        };

        return new Promise(function (resolve) {
            const onFinish = (() => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res._headers,
                    template: res._template,
                    req: req,
                    res: res
                });
            });

            res.once('finish', onFinish);
            // res.end() does not trigger "finish" event somehow
            res.once('prefinish', onFinish);

            app(req, res);
        });
    }
};
