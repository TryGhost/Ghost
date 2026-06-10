import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {    
    beforeEach,
    describe,
    it
} from 'mocha';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentRouteName, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Signin', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        mockAnalyticsApps();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    async function setupSigninFlow(server, {role = 'Administrator', fillForm = true} = {}) {
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

        // prohibitAuthentication sends authenticated users to the home
        // route, which hands "/" over to the React shell (react-fallback)
        expect(currentURL(), 'current url').to.equal('/');
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
            mockAnalyticsApps();
            
            invalidateSession();

            await visit('/signin');
            expect(currentURL(), 'current url').to.equal('/signin');

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'thisissupersafe');
            await click('[data-test-button="sign-in"]');
            // the React shell owns "/" and performs the post-signin role
            // redirect; Ember's home route parks on the react-fallback
            expect(currentURL(), 'currentURL').to.equal('/');
            
            cleanupMockAnalyticsApps();
        });
    });

    describe('success routing', function () {
        // The role-based redirect from "/" now lives in the React shell
        // (apps/admin/src/home-redirect.tsx); Ember's home route is an inert
        // parking spot for every role.
        it('lands on the inert home route (React owns the redirect)', async function () {
            await setupSigninFlow(this.server, {role: 'Administrator'});
            await click('[data-test-button="sign-in"]');

            expect(currentURL()).to.equal('/');
            expect(currentRouteName()).to.equal('home');
        });
    });
});
