/* eslint-env node */
/* eslint-disable camelcase */

const isCronBuild = process.env.TRAVIS_EVENT_TYPE === 'cron';

let launch_in_ci = ['Chrome'];

// we only test Firefox in nightly builds on CI to keep push/PR build times lower
if (isCronBuild) {
    launch_in_ci.push('Firefox');
}

module.exports = {
    framework: 'mocha',
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
