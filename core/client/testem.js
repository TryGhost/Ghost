/*jshint node:true */
/* jscs:disable disallowVar, disallowMultipleVarDecl */
/* jscs:disable requireTemplateStringsForConcatenation, requireCamelCaseOrUpperCaseIdentifiers */

var ciBrowsers = [],
    testem = {
        framework: 'mocha',
        test_page: 'tests/index.html?hidepassed',
        disable_watching: true,
        launch_in_dev: ['Chrome', 'Firefox'],
        launchers: {}
    };

function saucelabsBrowser(browser, os) {
    var key = 'SL_' + browser.toLowerCase().replace(' ', '_'), // normalize multi-word browsers
        launcher = {
            exe: 'ember',
            args: [
                'sauce:launch',
                '-b',
                browser,
                '--vi',
                'public',
                '-p',
                os,
                '--at',
                '--no-ct',
                '--u'
            ],
            protocol: 'browser'
        };

    testem.launchers[key] = launcher;

    return key;
}

if (process.env.CI === 'true') {
    ciBrowsers = [
        saucelabsBrowser('chrome', 'linux'),
        saucelabsBrowser('firefox', 'linux'),
        saucelabsBrowser('internet explorer', 'Windows 10')
    ];
} else {
    ciBrowsers = ['Chrome', 'Firefox'];
}

testem.launch_in_ci = ciBrowsers;

module.exports = testem;
