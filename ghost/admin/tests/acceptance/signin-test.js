import $ from 'jquery';
import destroyApp from '../helpers/destroy-app';
import startApp from '../helpers/start-app';
import {Response} from 'ember-cli-mirage';
import {
    afterEach,
    beforeEach,
    describe,
    it
} from 'mocha';
import {authenticateSession, invalidateSession} from '../helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Signin', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects if already authenticated', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession(application);
        await visit('/signin');

        expect(currentURL(), 'current url').to.equal('/');
    });

    describe('when attempting to signin', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role], slug: 'test-user'});

            server.post('/authentication/token', function (schema, {requestBody}) {
                /* eslint-disable camelcase */
                let {
                    grant_type: grantType,
                    username,
                    password,
                    client_id: clientId
                } = $.deparam(requestBody);

                expect(grantType, 'grant type').to.equal('password');
                expect(username, 'username').to.equal('test@example.com');
                expect(clientId, 'client id').to.equal('ghost-admin');

                if (password === 'thisissupersafe') {
                    return {
                        access_token: 'MirageAccessToken',
                        expires_in: 3600,
                        refresh_token: 'MirageRefreshToken',
                        token_type: 'Bearer'
                    };
                } else {
                    return new Response(401, {}, {
                        errors: [{
                            errorType: 'UnauthorizedError',
                            message: 'Invalid Password'
                        }]
                    });
                }
                /* eslint-enable camelcase */
            });
        });

        it('errors correctly', async function () {
            await invalidateSession(application);
            await visit('/signin');

            expect(currentURL(), 'signin url').to.equal('/signin');

            expect(find('input[name="identification"]').length, 'email input field')
                .to.equal(1);
            expect(find('input[name="password"]').length, 'password input field')
                .to.equal(1);

            await click('.gh-btn-blue');

            expect(find('.form-group.error').length, 'number of invalid fields')
                .to.equal(2);

            expect(find('.main-error').length, 'main error is displayed')
                .to.equal(1);

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'invalid');
            await click('.gh-btn-blue');

            expect(currentURL(), 'current url').to.equal('/signin');

            expect(find('.main-error').length, 'main error is displayed')
                .to.equal(1);

            expect(find('.main-error').text().trim(), 'main error text')
                .to.equal('Invalid Password');
        });

        it('submits successfully', async function () {
            invalidateSession(application);

            await visit('/signin');
            expect(currentURL(), 'current url').to.equal('/signin');

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'thisissupersafe');
            await click('.gh-btn-blue');
            expect(currentURL(), 'currentURL').to.equal('/');
        });
    });
});
