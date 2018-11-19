const _ = require('lodash');

const trimAndLowerCase = (params) => {
    params = params || '';

    if (_.isString(params)) {
        params = params.split(',');
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

module.exports.trimAndLowerCase = trimAndLowerCase;
