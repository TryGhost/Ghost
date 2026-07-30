/* eslint-env node */
/* eslint-disable camelcase */

let launch_in_ci = [process.env.BROWSER || 'Chrome'];

// escape hatch for machines where desktop Chrome hangs when launched headless
// with a fresh profile: point CHROME_HEADLESS_SHELL at a chrome-headless-shell
// binary (e.g. from a Playwright install) and run with
// BROWSER=ChromeHeadlessShell
let launchers = {};
if (process.env.CHROME_HEADLESS_SHELL) {
    launchers.ChromeHeadlessShell = {
        exe: process.env.CHROME_HEADLESS_SHELL,
        args: [
            '--disable-dev-shm-usage',
            '--mute-audio',
            '--remote-debugging-port=0',
            '--window-size=1440,900',
            `--user-data-dir=${require('os').tmpdir()}/testem-chrome-shell-${process.pid}`
        ],
        protocol: 'browser'
    };
}

module.exports = {
    launchers,
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
    },
    tap_failed_tests_only: true
};
