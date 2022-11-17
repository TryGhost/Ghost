const ghostConfig = require('./core/shared/config');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 10 * 1000,
    webServer: {
        command: 'yarn test:browser:start',
        url: ghostConfig.get('url')
    },
    use: {
        baseURL: ghostConfig.get('url')
    }
};

module.exports = config;
