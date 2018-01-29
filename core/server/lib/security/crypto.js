'use strict';

const crypto = require('crypto');

module.exports.md5 = (data) => {
    return crypto
        .createHash('md5')
        .update(data.value)
        .digest('hex')
        .substring(0, data.len);
};
