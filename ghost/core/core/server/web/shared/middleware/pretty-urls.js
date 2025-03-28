// Pretty URL redirects
//
// These are two pieces of middleware that handle ensuring that
// URLs get formatted correctly.
// Slashes ensures that we get trailing slashes
// Uncapitalise changes case to lowercase
// @TODO optimize this to reduce the number of redirects required to get to a pretty URL
// @TODO move this to being used by routers?
const slashes = require('connect-slashes');
const config = require('../../../../shared/config');

module.exports = [
    slashes(true, {
        headers: {
            'Cache-Control': `public, max-age=${config.get('caching:301:maxAge')}`
        }
    }),
    require('./uncapitalise')
];
