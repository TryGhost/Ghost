import config from 'ghost-admin/config/environment';
import {Response} from 'miragejs';
import {
    afterEach,
    beforeEach,
    describe,
    it
} from 'mocha';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {disableLabsFlag, enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Signin', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    // Helper function to setup signin flow
    async function setupSigninFlow(server, {role = 'Administrator', fillForm = true} = {}) {
        // Ensure fixtures are loaded
        if (!server.schema.configs.all().length) {
            server.loadFixtures('configs');
        }
        if (!server.schema.settings.all().length) {
            server.loadFixtures('settings');
        }
        
        let roleObj = server.create('role', {name: role});
        server.create('user', {roles: [roleObj], slug: 'test-user'});

        server.post('/session', function (schema, {requestBody}) {
            let {
                username,
                password
            } = JSON.parse(requestBody);

            expect(username).to.equal('test@example.com');

            if (password === 'thisissupersafe') {
                return new Response(201);
            } else {
                return new Response(401, {}, {
                    errors: [{
                        type: 'UnauthorizedError',
                        message: 'Invalid Password'
                    }]
                });
            }
        });

        await invalidateSession();
        await visit('/signin');

        if (fillForm) {
            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'thisissupersafe');
        }
    }

    it('redirects if already authenticated', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/signin');

        expect(currentURL(), 'current url').to.equal('/site');
    });

    describe('when attempting to signin', function () {
        beforeEach(function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'test-user'});

            this.server.post('/session', function (schema, {requestBody}) {
                let {
                    username,
                    password
                } = JSON.parse(requestBody);

                expect(username).to.equal('test@example.com');

                if (password === 'thisissupersafe') {
                    return new Response(201);
                } else {
                    return new Response(401, {}, {
                        errors: [{
                            type: 'UnauthorizedError',
                            message: 'Invalid Password'
                        }]
                    });
                }
            });
        });

        it('errors correctly', async function () {
            await invalidateSession();
            await visit('/signin');

            expect(currentURL(), 'signin url').to.equal('/signin');

            expect(findAll('input[name="identification"]').length, 'email input field')
                .to.equal(1);
            expect(findAll('input[name="password"]').length, 'password input field')
                .to.equal(1);

            await click('[data-test-button="sign-in"]');

            expect(findAll('.form-group.error').length, 'number of invalid fields')
                .to.equal(2);

            expect(findAll('.main-error').length, 'main error is displayed')
                .to.equal(1);

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'invalid');
            await click('[data-test-button="sign-in"]');

            expect(currentURL(), 'current url').to.equal('/signin');

            expect(findAll('.main-error').length, 'main error is displayed')
                .to.equal(1);

            expect(find('.main-error').textContent.trim(), 'main error text')
                .to.equal('Invalid Password');
        });

        it('submits successfully', async function () {
            invalidateSession();

            await visit('/signin');
            expect(currentURL(), 'current url').to.equal('/signin');

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'thisissupersafe');
            await click('[data-test-button="sign-in"]');
            expect(currentURL(), 'currentURL').to.equal('/dashboard');
        });

        it('submits successfully with traffic analytics enabled', async function () {
            // Mock the asset delivery config for stats component (comes from Admin config, not Ghost backend [fixture] config)
            config.statsFilename = 'stats.js';
            config.statsHash = 'development';
            
            // Mock the stats component to prevent actual loading
            // The component expects an object with AdminXApp property
            window['@tryghost/stats'] = {
                AdminXApp: function MockStatsComponent() {
                    return <div data-test-stats-component>Mock Stats Component</div>;
                }
            };
            
            this.server.loadFixtures('configs');
            enableLabsFlag(this.server, 'trafficAnalytics');

            invalidateSession();

            await visit('/signin');
            expect(currentURL(), 'current url').to.equal('/signin');

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'thisissupersafe');
            await click('[data-test-button="sign-in"]');
            expect(currentURL(), 'currentURL').to.equal('/analytics');
            expect(find('[data-test-stats-component]')).to.exist;
        });
    });

    describe('Success beta flags routing', function () {
        beforeEach(function () {
            mockAnalyticsApps();
        });

        afterEach(function () {
            cleanupMockAnalyticsApps();
        });

        it('administrators with no flags redirects to dashboard', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Administrator'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/dashboard');
        });

        it('administrators with trafficAnalytics flag redirects to analytics', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Administrator'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/analytics');
        });

        it('administrators with ui60 flag redirects to analytics', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Administrator'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/analytics');
        });

        it('non-admins with no flags redirects to site', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Author'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/site');
        });

        it('non-admins with trafficAnalytics flag redirects to site', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Author'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/site');
        });

        it('non-admins with ui60 flag redirects to site', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');
            
            await setupSigninFlow(this.server, {role: 'Author'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/site');
        });
    });
});
