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

var DEBUG = false, // TOGGLE THIS TO GET MORE SCREENSHOTS
    host = casper.cli.options.host || 'localhost',
    noPort = casper.cli.options.noPort || false,
    port = casper.cli.options.port || '2368',
    email = casper.cli.options.email || 'jbloggs@example.com',
    password = casper.cli.options.password || 'Sl1m3rson',
    url = 'http://' + host + (noPort ? '/' : ':' + port + '/'),
    newUser = {
        name: 'Test User',
        email: email,
        password: password
    },
    newSetup = {
        'blog-title': 'Test Blog',
        name: 'Test User',
        email: email,
        password: password
    },
    user = {
        identification: email,
        password: password
    },
    falseUser = {
        identification: email,
        password: 'letmethrough'
    },
    testPost = {
        title: 'Bacon ipsum dolor sit amet',
        html: 'I am a test post.\n#I have some small content'
    };

casper.writeContentToCodeMirror = function (content) {
    var lines = content.split('\n');

    casper.waitForSelector('.CodeMirror-wrap textarea', function onSuccess() {
        casper.each(lines, function (self, line) {
            self.sendKeys('.CodeMirror-wrap textarea', line, {keepFocus: true});
            self.sendKeys('.CodeMirror-wrap textarea', casper.page.event.key.Enter, {keepFocus: true});
        });

        return this;
    }, function onTimeout() {
        casper.test.fail('CodeMirror was not found.');
    }, 2000);
};

casper.waitForOpacity = function (classname, opacity, then, timeout) {
    timeout = timeout || casper.failOnTimeout(casper.test, 'waitForOpacity failed on ' + classname + ' ' + opacity);
    casper.waitForSelector(classname).then(function () {
        casper.waitFor(function checkOpaque() {
            var value = this.evaluate(function (element, opacity) {
                var target = document.querySelector(element);
                if (target === null) {
                    return null;
                }
                return window.getComputedStyle(target).getPropertyValue('opacity') === opacity;
            }, classname, opacity);
            if (value !== true && value !== false) {
                casper.test.fail('Unable to find element: ' + classname);
            }
            return value;
        }, then, timeout);
    });
};

casper.waitForOpaque = function (classname, then, timeout) {
    casper.waitForOpacity(classname, '1', then, timeout);
};

casper.waitForTransparent = function (classname, then, timeout) {
    casper.waitForOpacity(classname, '0', then, timeout);
};


// ### Then Open And Wait For Page Load
// Always wait for the `#main` element as some indication that the ember app has loaded.
casper.thenOpenAndWaitForPageLoad = function (screen, then, timeout) {
    then = then || function () {};
    timeout = timeout || casper.failOnTimeout(casper.test, 'Unable to load ' + screen);

    var screens = {
        'root': {
            url: 'ghost/ember/',
            selector: '#main-menu .content.active'
        },
        'content': {
            url: 'ghost/ember/content/',
            selector: '#main-menu .content.active'
        },
        'editor': {
            url: 'ghost/ember/editor/',
            selector: '#entry-title'
        },
        'settings': {
            url: 'ghost/ember/settings/',
            selector: '.settings-content'
        },
        'settings.general': {
            url: 'ghost/ember/settings/general',
            selector: '.settings-content .settings-general'
        },
        'settings.user': {
            url: 'ghost/ember/settings/user',
            selector: '.settings-content .settings-user'
        },
        'signin': {
            url: 'ghost/ember/signin/',
            selector: '.button-save'
        },
        'signout': {
            url: 'ghost/ember/signout/',
            // When no user exists we get redirected to setup which has button-add
            selector: '.button-save, .button-add'
        },
        'signup': {
            url: 'ghost/ember/signup/',
            selector: '.button-save'
        },
        'setup': {
            url: 'ghost/ember/setup/',
            selector: '.button-add'
        }
    };

    return casper.thenOpen(url + screens[screen].url).then(function () {
        // Some screens fade in
        return casper.waitForOpaque(screens[screen].selector, then, timeout, 10000);
    });
};

casper.failOnTimeout = function (test, message) {
    return function onTimeout() {
        test.fail(message);
    };
};

// ### Fill And Save
// With Ember in place, we don't want to submit forms, rather press the button which always has a class of
// 'button-save'. This method handles that smoothly.
casper.fillAndSave = function (selector, data) {
    casper.then(function doFill() {
        casper.fill(selector, data, false);
        casper.thenClick('.button-save');
    });
};

// ### Fill And Add
// With Ember in place, we don't want to submit forms, rather press the green button which always has a class of
// 'button-add'. This method handles that smoothly.
casper.fillAndAdd = function (selector, data) {
    casper.then(function doFill() {
        casper.fill(selector, data, false);
        casper.thenClick('.button-add');
    });
};

// ## Debugging
var jsErrors = [],
    pageErrors = [],
    resourceErrors = [];

// ## Echo Concise
// Does casper.echo but checks for the presence of the --concise flag
casper.echoConcise = function (message, style) {
    if (!casper.cli.options.concise) {
        casper.echo(message, style);
    }
};

// pass through all console.logs
casper.on('remote.message', function (msg) {
    casper.echoConcise('CONSOLE LOG: ' + msg, 'INFO');
});

// output any errors
casper.on('error', function (msg, trace) {
    casper.echoConcise('ERROR, ' + msg, 'ERROR');
    if (trace) {
        casper.echoConcise('file:     ' + trace[0].file, 'WARNING');
        casper.echoConcise('line:     ' + trace[0].line, 'WARNING');
        casper.echoConcise('function: ' + trace[0]['function'], 'WARNING');
    }
    jsErrors.push(msg);
});

// output any page errors
casper.on('page.error', function (msg, trace) {
    casper.echoConcise('PAGE ERROR: ' + msg, 'ERROR');
    if (trace) {
        casper.echoConcise('file:     ' + trace[0].file, 'WARNING');
        casper.echoConcise('line:     ' + trace[0].line, 'WARNING');
        casper.echoConcise('function: ' + trace[0]['function'], 'WARNING');
    }
    pageErrors.push(msg);
});

casper.on('resource.received', function(resource) {
    var status = resource.status;
    if(status >= 400) {
        casper.echoConcise('RESOURCE ERROR: ' + resource.url + ' failed to load (' + status + ')', 'ERROR');

        resourceErrors.push({
            url: resource.url,
            status: resource.status
        });
    }
});

casper.captureScreenshot = function (filename, debugOnly) {
    debugOnly = debugOnly !== false;
    // If we are in debug mode, OR debugOnly is false
    if (DEBUG || debugOnly === false) {
        filename = filename || 'casper_test_fail.png';
        casper.then(function () {
            casper.capture(new Date().getTime() + '_' + filename);
        });
    }
};

 // on failure, grab a screenshot
casper.test.on('fail', function captureFailure() {
    casper.captureScreenshot(casper.test.filename || 'casper_test_fail.png', false);
    casper.then(function () {
        console.log(casper.getHTML());
        casper.exit(1);
    });
});

// on exit, output any errors
casper.test.on('exit', function() {
    if (jsErrors.length > 0) {
        casper.echo(jsErrors.length + ' Javascript errors found', 'WARNING');
    } else {
        casper.echo(jsErrors.length + ' Javascript errors found', 'INFO');
    }
    if (pageErrors.length > 0) {
        casper.echo(pageErrors.length + ' Page errors found', 'WARNING');
    } else {
        casper.echo(pageErrors.length + ' Page errors found', 'INFO');
    }

    if (resourceErrors.length > 0) {
        casper.echo(resourceErrors.length + ' Resource errors found', 'WARNING');
    } else {
        casper.echo(resourceErrors.length + ' Resource errors found', 'INFO');
    }
});

var CasperTest = (function () {

    var _beforeDoneHandler,
        _noop = function noop() { },
        _isUserRegistered = false;

    // Always log out at end of test.
    casper.test.tearDown(function (done) {
        casper.then(_beforeDoneHandler);

        CasperTest.Routines.signout.run();

        casper.run(done);
    });

    // Wrapper around `casper.test.begin`
    function oldBegin(testName, expect, suite, doNotAutoLogin) {
        _beforeDoneHandler = _noop;

        var runTest = function (test) {
            test.filename = testName.toLowerCase().replace(/ /g, '-').concat('.png');

            casper.start('about:blank').viewport(1280, 1024);

            if (!doNotAutoLogin) {
                // Only call register once for the lifetime of Mindless
                if (!_isUserRegistered) {
                    CasperTest.Routines.oldLogout.run(test);
                    CasperTest.Routines.oldRegister.run(test);

                    _isUserRegistered = true;
                }

                /* Ensure we're logged out at the start of every test or we may get
                   unexpected failures. */
                CasperTest.Routines.oldLogout.run(test);
                CasperTest.Routines.oldLogin.run(test);
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

    function begin(testName, expect, suite, doNotAutoLogin) {
        _beforeDoneHandler = _noop;

        var runTest = function (test) {
            test.filename = testName.toLowerCase().replace(/ /g, '-').concat('.png');

            casper.start('about:blank').viewport(1280, 1024);

            if (!doNotAutoLogin) {
                // Only call register once for the lifetime of CasperTest
                if (!_isUserRegistered) {

                    CasperTest.Routines.signout.run();
                    CasperTest.Routines.setup.run();

                    _isUserRegistered = true;
                }

                /* Ensure we're logged out at the start of every test or we may get
                 unexpected failures. */
                CasperTest.Routines.signout.run();
                CasperTest.Routines.signin.run();
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
        oldBegin: oldBegin,
        begin: begin,
        beforeDone: beforeDone
    };

}());

CasperTest.Routines = (function () {

    function oldRegister(test) {
        casper.thenOpen(url + 'ghost/signup/');

        casper.waitForOpaque('.signup-box', function then() {
            this.fill('#signup', newUser, true);
        });

        casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
            var errorText = casper.evaluate(function () {
                return document.querySelector('.notification-error').innerText;
            });
            casper.echoConcise('It appears as though a user is already registered. Error text: ' + errorText);
        }, function onTimeout() {
            casper.echoConcise('It appears as though a user was not already registered.');
        }, 2000);
    }

    function setup() {
        casper.thenOpenAndWaitForPageLoad('setup', function then() {
            casper.captureScreenshot('ember_setting_up1.png');

            casper.waitForOpaque('.setup-box', function then() {
                this.fillAndAdd('#setup', newSetup);
            });

            casper.captureScreenshot('ember_setting_up2.png');

            casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
                var errorText = casper.evaluate(function () {
                    return document.querySelector('.notification-error').innerText;
                });
                casper.echoConcise('It appears as though a user is already registered. Error text: ' + errorText);
            }, function onTimeout() {
                casper.echoConcise('It appears as though a user was not already registered.');
            }, 2000);

            casper.captureScreenshot('ember_setting_up3.png');

        });
    }

    function oldLogin(test) {
        casper.thenOpen(url + 'ghost/signin/');

        casper.waitForResource(/ghost\/signin/);

        casper.waitForSelector('.login-box', function () {}, function () {
            console.log(casper.getHTML());
        });

        casper.waitForOpaque('.login-box', function then() {
            casper.captureScreenshot('got_sign_in.png');
            this.fill('#login', user, true);
            casper.captureScreenshot('filled_sign_in.png');
        });

        casper.waitForResource(/ghost\/$/).then(function () {
            casper.captureScreenshot('have_logged_in.png');
        });
    }

    function signin() {
        casper.thenOpenAndWaitForPageLoad('signin', function then() {

            casper.waitForOpaque('.login-box', function then() {
                casper.captureScreenshot('ember_signing_in.png');
                this.fillAndSave('#login', user);
                casper.captureScreenshot('ember_signing_in2.png');
            });

            casper.waitForResource(/posts\/\?status=all&staticPages=all/, function then() {
                casper.captureScreenshot('ember_signing_in3.png');
            }, function timeout() {
                casper.test.fail('Unable to signin and load admin panel');
            });
        });
    }

    function oldLogout(test) {
        casper.thenOpen(url + 'ghost/signout/');

        casper.captureScreenshot('logging_out.png');

        // Wait for signin or signup
        casper.waitForResource(/ghost\/sign/);
    }

    function signout() {
        casper.thenOpenAndWaitForPageLoad('signout', function then() {
            casper.captureScreenshot('ember_signing_out.png');
        });
    }

    // This will need switching over to ember once settings general is working properly.
    function togglePermalinks(state) {
        casper.thenOpenAndWaitForPageLoad('settings.general', function then() {
            var currentState = this.evaluate(function () {
                return document.querySelector('#permalinks') && document.querySelector('#permalinks').checked ? 'on' : 'off';
            });
            if (currentState !== state) {
                casper.thenClick('#permalinks');
                casper.thenClick('.button-save');

                casper.captureScreenshot('saving.png');

                casper.waitForSelector('.notification-success', function () {
                    casper.captureScreenshot('saved.png');
                });
            }
        });
    }

    function createTestPost(publish) {
        casper.thenOpenAndWaitForPageLoad('editor', function createTestPost() {
            casper.sendKeys('#entry-title', testPost.title);
            casper.writeContentToCodeMirror(testPost.html);
            casper.sendKeys('#entry-tags input.tag-input', 'TestTag');
            casper.sendKeys('#entry-tags input.tag-input', casper.page.event.key.Enter);
        });

        casper.waitForSelectorTextChange('.entry-preview .rendered-markdown');

        if (publish) {
            // Open the publish options menu;
            casper.thenClick('.js-publish-splitbutton .options.up');

            casper.waitForOpaque('.js-publish-splitbutton .open');

            // Select the publish post button
            casper.thenClick('.js-publish-splitbutton li:first-child a');

            casper.waitForSelectorTextChange('.js-publish-button', function onSuccess() {
                casper.thenClick('.js-publish-button');
            });
        } else {
            casper.thenClick('.js-publish-button');
        }

        casper.waitForResource(/posts\/\?include=tags$/);
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
        oldRegister: _createRunner(oldRegister),
        oldLogin: _createRunner(oldLogin),
        oldLogout: _createRunner(oldLogout),
        togglePermalinks: _createRunner(togglePermalinks),
        setup: _createRunner(setup),
        signin: _createRunner(signin),
        signout: _createRunner(signout),
        createTestPost: _createRunner(createTestPost)
    };

}());