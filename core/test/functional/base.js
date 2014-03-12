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
 * casperjs test admin/ --includes=base.js [--host=localhost --port=2368 --noPort=false --email=ghost@tryghost.org --password=Sl1m3r]
 *
 * --host - your local host address e.g. localhost or local.tryghost.org
 * --port - port number of your local Ghost
 * --email - the email address your admin user is registered with
 * --password - the password your admin user is registered with
 * --noPort - don't include a port number
 *
 * Requirements:
 * you must have phantomjs 1.9.1 and casperjs 1.1.0-DEV installed in order for these tests to work
 */

var host = casper.cli.options.host || 'localhost',
    noPort = casper.cli.options.noPort || false,
    port = casper.cli.options.port || '2368',
    email = casper.cli.options.email || 'ghost@tryghost.org',
    password = casper.cli.options.password || 'Sl1m3rson',
    url = "http://" + host + (noPort ? '/' : ":" + port + "/"),
    newUser = {
        name: "Test User",
        email: email,
        password: password
    },
    user = {
        email: email,
        password: password
    },
    falseUser = {
        email: email,
        password: 'letmethrough'
    },
    testPost = {
        title: "Bacon ipsum dolor sit amet",
        html: "I am a test post.\n#I have some small content"
    };

casper.writeContentToCodeMirror = function (content) {
    var lines = content.split("\n");

    casper.each(lines, function (self, line) {
        self.sendKeys('.CodeMirror-wrap textarea', line, {keepFocus: true});
        self.sendKeys('.CodeMirror-wrap textarea', casper.page.event.key.Enter, {keepFocus: true});
    });

    return this;
};

casper.waitForOpaque = function (classname, then, timeout) {
    casper.waitFor(function checkOpaque() {
        return this.evaluate(function (element) {
            var target = document.querySelector(element);
            return window.getComputedStyle(target).getPropertyValue('opacity') === "1";
        }, classname);
    }, then, timeout);
};

// ## Debugging
// output all errors to the console
casper.on('remote.message', function (msg) {
    casper.echo('GOT CONSOLE LOG: ' + msg);
});

casper.on('error', function (msg, trace) {
    casper.echo('GOT ERROR, ' + msg);
});

casper.on("page.error", function (msg, trace) {
    this.echo("GOT PAGE ERROR: " + msg, "ERROR");
});

// on failure, grab a screenshot
casper.test.on("fail", function captureFailure() {
    var filename = casper.test.filename || "casper_test_fail.png";
    casper.capture(new Date().getTime() + '_' + filename);
});