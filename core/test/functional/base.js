/*globals Ghost, casper, __utils__ */

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
    email = casper.cli.options.email || 'jbloggs@example.com',
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

casper.on('error', function (msg) {
    casper.echo('GOT ERROR, ' + msg);
});

casper.on("page.error", function (msg) {
    this.echo("GOT PAGE ERROR: " + msg, "ERROR");
});

// on failure, grab a screenshot
casper.test.on("fail", function captureFailure() {
    var filename = casper.test.filename || "casper_test_fail.png";
    casper.capture(new Date().getTime() + '_' + filename);
});

var CasperTest = (function () {

    var _beforeDoneHandler,
        _noop = function noop() { },
        _isUserRegistered = false;

    // Always log out at end of test.
    casper.test.tearDown(function (done) {
        casper.then(_beforeDoneHandler);

        casper.thenOpen(url + 'signout/');

        casper.waitForResource(/ghost\/sign/);

        casper.run(done);
    });

    // Wrapper around `casper.test.begin`
    function begin(testName, expect, suite, doNotAutoLogin) {
        _beforeDoneHandler = _noop;

        var runTest = function (test) {
            test.filename = testName.toLowerCase().replace(/ /g, '-').concat('.png');

            casper.start('about:blank').viewport(1280, 1024);

            if (!doNotAutoLogin) {
                // Only call register once for the lifetime of Mindless
                if (!_isUserRegistered) {
                    CasperTest.Routines.logout.run(test);
                    CasperTest.Routines.register.run(test);

                    _isUserRegistered = true;
                }

                /* Ensure we're logged out at the start of every test or we may get
                   unexpected failures. */
                CasperTest.Routines.logout.run(test);
                CasperTest.Routines.login.run(test);
            }

            suite.call(casper, test);

            casper.run(function () {
                test.done();
            });
        };

        if (typeof expect === 'function') {
            doNotAutoLogin = suite;
            suite = expect;

            casper.test.begin(testName, runTest);
        } else {
            casper.test.begin(testName, expect, runTest);
        }
    }

    // Sets a handler to be invoked right before `test.done` is invoked
    function beforeDone(fn) {
        if (fn) {
            _beforeDoneHandler = fn;
        } else {
            _beforeDoneHandler = _noop;
        }
    }

    return {
        begin: begin,
        beforeDone: beforeDone
    };

}());

CasperTest.Routines = (function () {

    function register(test) {
        casper.thenOpen(url + 'ghost/signup/').viewport(1280, 1024);

        casper.waitForOpaque('.signup-box', function then() {
            this.fill('#signup', newUser, true);
        });

        casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
            var errorText = casper.evaluate(function () {
                return document.querySelector('.notification-error').innerText;
            });
            this.echo('It appears as though a user is already registered. Error text: ' + errorText);
        }, function onTimeout() {
            this.echo('It appears as though a user was not already registered.');
        }, 2000);
    }

    function login(test) {
        casper.thenOpen(url + 'ghost/signin/');

        casper.waitForOpaque('.login-box', function then() {
            this.fill("#login", user, true);
        });

        casper.waitForResource(/ghost\/$/);
    }

    function logout(test) {
        casper.thenOpen(url + 'signout/');
        // Wait for signin or signup
        casper.waitForResource(/ghost\/sign/);
    }

    function deletePost(id) {
        casper.thenOpen(url + 'ghost/');

        casper.thenEvaluate(function (id) {
            return __utils__.sendAJAX(Ghost.settings.apiRoot + '/posts/' + id, 'DELETE');
        }, id);
    }

    function _createRunner(fn) {
        fn.run = function run(test) {
            var routine = this;

            casper.then(function () {
                routine.call(casper, test);
            });
        };

        return fn;
    }

    return {
        register: _createRunner(register),
        login: _createRunner(login),
        logout: _createRunner(logout),
        deletePost: _createRunner(deletePost)
    };

}());