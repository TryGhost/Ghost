const config = require('../../../shared/config');
const escapeRegExp = require('lodash/escapeRegExp');
const {URL} = require('url');

const DEFAULT_HOST_ARG = /.*/;

const getHostsFromConfig = () => {
    const frontendHost = new URL(config.getSiteUrl()).hostname;

    const backendHost = config.getAdminUrl() ? (new URL(config.getAdminUrl()).hostname) : '';
    const hasSeparateBackendHost = backendHost && backendHost !== frontendHost;

    return {
        backendHost,
        hasSeparateBackendHost
    };
};

/**
 *
 * @returns {string|RegExp}
 */
module.exports.getBackendHostArg = () => {
    const {backendHost, hasSeparateBackendHost} = getHostsFromConfig();

    // with a separate admin url only serve on that host, otherwise serve on all hosts
    return (hasSeparateBackendHost) && backendHost ? backendHost : DEFAULT_HOST_ARG;
};

/**
 *
 * @returns {string|RegExp}
 */
module.exports.getFrontendHostArg = () => {
    const {backendHost, hasSeparateBackendHost} = getHostsFromConfig();

    // with a separate admin url we adjust the frontend vhost to exclude requests to that host, otherwise serve on all hosts
    return (hasSeparateBackendHost && backendHost) ? new RegExp(`^(?!${escapeRegExp(backendHost)}).*`) : DEFAULT_HOST_ARG;
};
