const {SSOBase} = require('@tryghost/adapter-base-sso');

// NOTE: this is a temporary shim to ensure that Moya requires continue to work
// until @tryghost/adapter-base-sso is published to NPM and Moya depends on it directly.
module.exports = SSOBase;
