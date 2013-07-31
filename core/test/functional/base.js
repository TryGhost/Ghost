/*globals casper, __utils__ */

/**
 * Casper Tests
 *
 * Functional browser tests for checking that the Ghost Admin UI is working as expected
 * The setup of these tests is a little hacky for now, which is why they are not wired in to grunt
 * Requires that you are running Ghost locally and have already registered a single user
 *
 * Usage (from test/functional):
 *
 * casperjs test admin/ --includes=base.js [--host=localhost --port=2368 --email=ghost@tryghost.org --password=Sl1m3r]
 *
 * --host - your local host address e.g. localhost or local.tryghost.org
 * --port - port number of your local Ghost
 * --email - the email address your admin user is registered with
 * --password - the password your admin user is registered with
 *
 * Requirements:
 * you must have phantomjs 1.9.1 and casperjs 1.1.0-DEV installed in order for these tests to work
 */

var host = casper.cli.options.url || 'localhost',
    port = casper.cli.options.port || '2368',
    email = casper.cli.options.email || 'ghost@tryghost.org',
    password = casper.cli.options.password || 'Sl1m3r',
    url = "http://" + host + ":" + port + "/",
    user = {
        email: email,
        password: password
    },
    testPost = {title: "A post title", content: "I am a post \n #With some content"};


casper.test.on("fail", function captureFailure(failure) {
    var filename = casper.test.filename || "casper_test_fail.png";
    casper.capture(new Date().getTime() + '_' + filename);
});