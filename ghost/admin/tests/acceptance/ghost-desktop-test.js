/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import { authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';

const originalAgent = window.navigator.userAgent;

const setUserAgent = function (userAgent) {
    let userAgentProp = {
        get() {
            return userAgent;
        },
        configurable: true
    };

    try {
        Object.defineProperty(window.navigator, 'userAgent', userAgentProp);
    } catch (e) {
        window.navigator = Object.create(window.navigator, {
            userAgent: userAgentProp
        });
    }
};

const restoreUserAgent = function () {
    setUserAgent(originalAgent);
};

describe('Acceptance: Ghost Desktop', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    describe('update alerts for broken versions', function () {
        beforeEach(function() {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        afterEach(function() {
            restoreUserAgent();
        });

        it('displays alert for broken version', function() {
            setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) ghost-desktop/0.4.0 Chrome/51.0.2704.84 Electron/1.2.2 Safari/537.36');

            visit('/');

            andThen(function () {
                // has an alert with matching text
                expect(find('.gh-alert-yellow').length, 'number of warning alerts').to.equal(1);
                expect(find('.gh-alert-yellow').text().trim(), 'alert text').to.match(/Your version of Ghost Desktop needs to be manually updated/);
            });
        });

        it('doesn\'t display alert for working version', function () {
            setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) ghost-desktop/0.5.1 Chrome/51.0.2704.84 Electron/1.2.2 Safari/537.36');

            visit('/');

            andThen(function () {
                // no alerts
                expect(find('.gh-alert').length, 'number of alerts').to.equal(0);
            });
        });
    });
});
