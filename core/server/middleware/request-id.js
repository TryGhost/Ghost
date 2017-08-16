var uuid = require('uuid'),
    _ = require('lodash'),
    headerName = 'X-Request-Id',
    idAttribute = 'requestId';

module.exports = function requestId(req, res, next) {
    req.userId = _.get(req, 'user.id', null);

    req[idAttribute] = req.header(headerName) || uuid.v1();
    res.setHeader(headerName, req[idAttribute]);

    next();
};
