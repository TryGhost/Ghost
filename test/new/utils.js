const boot = require('../../core/boot');
const urlServiceUtils = require('../utils/url-service-utils');
const cacheRules = require('../utils/fixtures/cache-rules');

module.exports.startGhost = async () => {
    const startTime = Date.now();
    await boot();
    console.log(`Ghost booted in ${(Date.now() - startTime) / 1000}s`); // eslint-disable-line no-console

    await urlServiceUtils.isFinished();
    console.log(`Ghost ready in ${(Date.now() - startTime) / 1000}s`); // eslint-disable-line no-console
};

module.exports.cacheRules = cacheRules;
