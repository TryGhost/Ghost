// Pretty URL redirects
//
// These are two pieces of middleware that handle ensuring that
// URLs get formatted correctly.
// Slashes ensures that we get trailing slashes
// Uncapitalise changes case to lowercase
// @TODO optimise this to reduce the number of redirects required to get to a pretty URL
// @TODO move this to being used by routers?
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
