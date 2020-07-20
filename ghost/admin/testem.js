/* eslint-env node */
/* eslint-disable camelcase */

let launch_in_ci = [process.env.BROWSER || 'Chrome'];

module.exports = {
    framework: 'mocha',
    browser_start_timeout: 120,
    browser_disconnect_timeout: 60,
    test_page: 'tests/index.html?hidepassed',
    disable_watching: true,
    parallel: process.env.EMBER_EXAM_SPLIT_COUNT || 1,
    launch_in_ci,
    launch_in_dev: [
        'Chrome',
        'Firefox'
    ],
    browser_args: {
        Chrome: {
            ci: [
                // --no-sandbox is needed when running Chrome inside a container
                process.env.CI ? '--no-sandbox' : null,
                '--headless',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--mute-audio',
                '--remote-debugging-port=0',
                '--window-size=1440,900'
            ].filter(Boolean)
        },
        Firefox: {
            ci: ['-headless']
        }
    }
};
