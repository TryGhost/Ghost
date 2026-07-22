const {SchedulingBase} = require('@tryghost/adapter-base-scheduling');

// NOTE: this is a temporary shim to ensure that Moya requires continue to work
// until @tryghost/adapter-base-scheduling is published to NPM and Moya depends on it directly
module.exports = SchedulingBase;
