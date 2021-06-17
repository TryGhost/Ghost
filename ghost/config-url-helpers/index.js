const configUrlHelpers = require('./lib/config-url-helpers');

module.exports.bindAll = (nconf) => {
    Object.keys(configUrlHelpers).forEach((helper) => {
        nconf[helper] = configUrlHelpers[helper].bind(nconf);
    });
};
