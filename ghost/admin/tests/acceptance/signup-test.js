import destroyApp from '../helpers/destroy-app';
import startApp from '../helpers/start-app';
import {
    afterEach,
    beforeEach,
    describe,
    it
} from 'mocha';
import {expect} from 'chai';

describe('Acceptance: Signup', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('can signup successfully', async function () {
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

        expect(currentPath()).to.equal('signup');

        // email address should be pre-filled and disabled
        expect(
            find('input[name="email"]').val(),
            'email field value'
        ).to.equal('kevin+test2@ghost.org');

        expect(
            find('input[name="email"]').is(':disabled'),
            'email field is disabled'
        ).to.be.true;

        // focus out in Name field triggers inline error
        await triggerEvent('input[name="name"]', 'blur');

        expect(
            find('input[name="name"]').closest('.form-group').hasClass('error'),
            'name field group has error class when empty'
        ).to.be.true;

        expect(
            find('input[name="name"]').closest('.form-group').find('.response').text().trim(),
            'name inline-error text'
        ).to.match(/Please enter a name/);

        // entering text in Name field clears error
        await fillIn('input[name="name"]', 'Test User');
        await triggerEvent('input[name="name"]', 'blur');

        expect(
            find('input[name="name"]').closest('.form-group').hasClass('error'),
            'name field loses error class after text input'
        ).to.be.false;

        expect(
            find('input[name="name"]').closest('.form-group').find('.response').text().trim(),
            'name field error is removed after text input'
        ).to.equal('');

        // check password validation
        // focus out in password field triggers inline error
        // no password
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').hasClass('error'),
            'password field group has error class when empty'
        ).to.be.true;

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error text'
        ).to.match(/must be at least 10 characters/);

        // password too short
        await fillIn('input[name="password"]', 'short');
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error text'
        ).to.match(/must be at least 10 characters/);

        // password must not be a bad password
        await fillIn('input[name="password"]', '1234567890');
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error text'
        ).to.match(/you cannot use an insecure password/);

        // password must not be a disallowed password
        await fillIn('input[name="password"]', 'password99');
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error text'
        ).to.match(/you cannot use an insecure password/);

        // password must not have repeating characters
        await fillIn('input[name="password"]', '2222222222');
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error text'
        ).to.match(/you cannot use an insecure password/);

        // entering valid text in Password field clears error
        await fillIn('input[name="password"]', 'thisissupersafe');
        await triggerEvent('input[name="password"]', 'blur');

        expect(
            find('input[name="password"]').closest('.form-group').hasClass('error'),
            'password field loses error class after text input'
        ).to.be.false;

        expect(
            find('input[name="password"]').closest('.form-group').find('.response').text().trim(),
            'password field error is removed after text input'
        ).to.equal('');

        // submitting sends correct details and redirects to content screen
        await click('.gh-btn-green');

        expect(currentPath()).to.equal('posts.index');
    });

    it('redirects if already logged in');
    it('redirects with alert on invalid token');
    it('redirects with alert on non-existant or expired token');
});
