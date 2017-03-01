/*jshint node:true*/
module.exports = {
    "framework": "qunit",
    "test_page": "tests/index.html?hidepassed",
    "phantomjs_debug_port": 9000,
    "disable_watching": true,
    "launch_in_ci": [
        "chrome"
    ],
    "launch_in_dev": [
        "chrome"
    ]
};
