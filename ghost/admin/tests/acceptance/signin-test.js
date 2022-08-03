import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {
    beforeEach,
    describe,
    it
} from 'mocha';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Signin', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

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

            await click('.js-login-button');

            expect(findAll('.form-group.error').length, 'number of invalid fields')
                .to.equal(2);

            expect(findAll('.main-error').length, 'main error is displayed')
                .to.equal(1);

            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'invalid');
            await click('.js-login-button');

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
            await click('.js-login-button');
            expect(currentURL(), 'currentURL').to.equal('/dashboard');
        });
    });
});
