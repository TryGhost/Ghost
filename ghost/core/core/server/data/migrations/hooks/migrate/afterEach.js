/* eslint-disable ghost/filenames/match-regex */
const Promise = require('bluebird');

module.exports = function afterEach() {
    return Promise.resolve();
};
