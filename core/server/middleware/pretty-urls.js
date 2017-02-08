var slashes = require('connect-slashes'),
    utils = require('../utils');

module.exports = [
    slashes(true, {
        headers: {
            'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S
        }
    }),
    require('./uncapitalise')
];
