import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {blur, click, currentRouteName, fillIn, find} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {visit} from '../helpers/visit';

describe('Acceptance: Signup', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('can signup successfully', async function () {
        let server = this.server;

        server.get('/authentication/invitation', function () {
            return {
                invitation: [{valid: true}]
            };
        });

        server.post('/authentication/invitation/', function ({users}, {requestBody}) {
            let params = JSON.parse(requestBody);
            expect(params.invitation[0].name).to.equal('Test User');
            expect(params.invitation[0].email).to.equal('kevin+test2@ghost.org');
            expect(params.invitation[0].password).to.equal('thisissupersafe');
            expect(params.invitation[0].token).to.equal('MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');

            // ensure that `/users/me/` request returns a user
            let role = server.create('role', {name: 'Author'});
            users.create({email: 'kevin@test2@ghost.org', roles: [role]});

            return {
                invitation: [{
                    message: 'Invitation accepted.'
                }]
            };
        });

        // token details:
        // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="
        await visit('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');

        expect(currentRouteName()).to.equal('signup');

        // email address should be pre-filled and disabled
        expect(
            find('input[name="email"]').value,
            'email field value'
        ).to.equal('kevin+test2@ghost.org');

        expect(
            find('input[name="email"]').matches(':disabled'),
            'email field is disabled'
        ).to.be.true;

        // focus out in Name field triggers inline error
        await blur('input[name="name"]');

        expect(
            find('input[name="name"]').closest('.form-group'),
            'name field group has error class when empty'
        ).to.have.class('error');

        expect(
            find('input[name="name"]').closest('.form-group').querySelector('.response').textContent,
            'name inline-error text'
        ).to.have.string('Please enter a name');

        // entering text in Name field clears error
        await fillIn('input[name="name"]', 'Test User');
        await blur('input[name="name"]');

        expect(
            find('input[name="name"]').closest('.form-group'),
            'name field loses error class after text input'
        ).to.not.have.class('error');

        expect(
            find('input[name="name"]').closest('.form-group').querySelector('.response').textContent.trim(),
            'name field error is removed after text input'
        ).to.be.empty;

        // check password validation
        // focus out in password field triggers inline error
        // no password
        await click('input[name="password"]');
        await blur();

        expect(
            find('input[name="password"]').closest('.form-group'),
            'password field group has error class when empty'
        ).to.have.class('error');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent,
            'password field error text'
        ).to.have.string('must be at least 10 characters');

        // password too short
        await fillIn('input[name="password"]', 'short');
        await blur('input[name="password"]');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent,
            'password field error text'
        ).to.have.string('must be at least 10 characters');

        // password must not be a bad password
        await fillIn('input[name="password"]', '1234567890');
        await blur('input[name="password"]');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent,
            'password field error text'
        ).to.have.string('you cannot use an insecure password');

        // password must not be a disallowed password
        await fillIn('input[name="password"]', 'password99');
        await blur('input[name="password"]');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent,
            'password field error text'
        ).to.have.string('you cannot use an insecure password');

        // password must not have repeating characters
        await fillIn('input[name="password"]', '2222222222');
        await blur('input[name="password"]');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent,
            'password field error text'
        ).to.have.string('you cannot use an insecure password');

        // entering valid text in Password field clears error
        await fillIn('input[name="password"]', 'thisissupersafe');
        await blur('input[name="password"]');

        expect(
            find('input[name="password"]').closest('.form-group'),
            'password field loses error class after text input'
        ).to.not.have.class('error');

        expect(
            find('input[name="password"]').closest('.form-group').querySelector('.response').textContent.trim(),
            'password field error is removed after text input'
        ).to.equal('');

        // submitting sends correct details and redirects to content screen
        await click('.gh-btn-green');

        expect(currentRouteName()).to.equal('posts.index');
    });

    it('redirects if already logged in', async function () {
        this.server.get('/authentication/invitation', function () {
            return {
                invitation: [{valid: true}]
            };
        });

        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        // token details:
        // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="
        await visit('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');

        expect(currentRouteName()).to.equal('posts.index');
        expect(find('.gh-alert-content').textContent).to.have.string('sign out to register');
    });

    it('redirects with alert on invalid token', async function () {
        await invalidateSession();
        await visit('/signup/---invalid---');

        expect(currentRouteName()).to.equal('signin');
        expect(find('.gh-alert-content').textContent).to.have.string('Invalid token');
    });

    it('redirects with alert on non-existant or expired token', async function () {
        this.server.get('/authentication/invitation', function () {
            return {
                invitation: [{valid: false}]
            };
        });

        await invalidateSession();
        await visit('/signup/expired');

        expect(currentRouteName()).to.equal('signin');
        expect(find('.gh-alert-content').textContent).to.have.string('not exist');
    });
});
