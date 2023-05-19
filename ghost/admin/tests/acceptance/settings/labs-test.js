import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {disableLabsFlag, enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Labs', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to home page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    it('redirects to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it renders', async function () {
            await visit('/settings/labs');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

            // highlights nav menu
            expect(find('[data-test-nav="settings"]'), 'highlights nav menu item')
                .to.have.class('active');
        });

        it('can delete all content', async function () {
            await visit('/settings/labs');
            await click('[data-test-button="delete-all"]');

            const modal = '[data-test-modal="confirm-delete-all"]';
            expect(find(modal)).to.exist;

            await click(`${modal} [data-test-button="confirm"]`);

            // API request is correct
            const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.url).to.equal('/ghost/api/admin/db/');
            expect(lastRequest.method).to.equal('DELETE');

            expect(find(modal)).to.not.exist;
        });

        it('can upload/download redirects', async function () {
            await visit('/settings/labs');

            // successful upload
            this.server.post('/redirects/upload/', {}, 200);

            await fileUpload(
                '[data-test-file-input="redirects"] input',
                ['test'],
                {name: 'redirects.json', type: 'application/json'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // // shows success button
            // let buttons = findAll('[data-test-button="upload-redirects"]');
            // expect(buttons.length, 'no of success buttons').to.equal(1);
            // expect(
            //     buttons[0],
            //     'success button is green'
            // ).to.have.class('gh-btn-green);
            // expect(
            //     button.textContent,
            //     'success button text'
            // ).to.have.string('Uploaded');
            //
            // await wait();

            // returned to normal button
            let buttons = findAll('[data-test-button="upload-redirects"]');
            expect(buttons.length, 'no of post-success buttons').to.equal(1);
            expect(
                buttons[0],
                'post-success button doesn\'t have success class'
            ).to.not.have.class('gh-btn-green');
            expect(
                buttons[0].textContent,
                'post-success button text'
            ).to.have.string('Upload redirects');

            // failed upload
            this.server.post('/redirects/upload/', {
                errors: [{
                    type: 'BadRequestError',
                    message: 'Test failure message'
                }]
            }, 400);

            await fileUpload(
                '[data-test-file-input="redirects"] input',
                ['test'],
                {name: 'redirects-bad.json', type: 'application/json'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // shows failure button
            // buttons = findAll('[data-test-button="upload-redirects"]');
            // expect(buttons.length, 'no of failure buttons').to.equal(1);
            // expect(
            //     buttons[0],
            //     'failure button is red'
            // ).to.have.class('gh-btn-red);
            // expect(
            //     buttons[0].textContent,
            //     'failure button text'
            // ).to.have.string('Upload Failed');
            //
            // await wait();

            // shows error message
            expect(
                find('[data-test-error="redirects"]').textContent.trim(),
                'upload error text'
            ).to.have.string('Test failure message');

            // returned to normal button
            buttons = findAll('[data-test-button="upload-redirects"]');
            expect(buttons.length, 'no of post-failure buttons').to.equal(1);
            expect(
                buttons[0],
                'post-failure button doesn\'t have failure class'
            ).to.not.have.class('gh-btn-red');
            expect(
                buttons[0].textContent,
                'post-failure button text'
            ).to.have.string('Upload redirects');

            // successful upload clears error
            this.server.post('/redirects/upload/', {}, 200);
            await fileUpload(
                '[data-test-file-input="redirects"] input',
                ['test'],
                {name: 'redirects-bad.json', type: 'application/json'}
            );

            expect(find('[data-test-error="redirects"]')).to.not.exist;

            // can download redirects.json
            await click('[data-test-link="download-redirects"]');

            let iframe = document.querySelector('#iframeDownload');
            expect(iframe.getAttribute('src')).to.have.string('/redirects/download/');
        });

        it('can upload/download routes.yaml', async function () {
            await visit('/settings/labs');

            // successful upload
            this.server.post('/settings/routes/yaml/', {}, 200);

            await fileUpload(
                '[data-test-file-input="routes"] input',
                ['test'],
                {name: 'routes.yaml', type: 'application/x-yaml'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // // shows success button
            // let button = find('[data-test-button="upload-routes"]');
            // expect(button.length, 'no of success buttons').to.equal(1);
            // expect(
            //     button.hasClass('gh-btn-green'),
            //     'success button is green'
            // ).to.be.true;
            // expect(
            //     button.text().trim(),
            //     'success button text'
            // ).to.have.string('Uploaded');
            //
            // await wait();

            // returned to normal button
            let buttons = findAll('[data-test-button="upload-routes"]');
            expect(buttons.length, 'no of post-success buttons').to.equal(1);
            expect(
                buttons[0],
                'routes post-success button doesn\'t have success class'
            ).to.not.have.class('gh-btn-green');
            expect(
                buttons[0].textContent,
                'routes post-success button text'
            ).to.have.string('Upload routes YAML');

            // failed upload
            this.server.post('/settings/routes/yaml/', {
                errors: [{
                    type: 'BadRequestError',
                    message: 'Test failure message'
                }]
            }, 400);

            await fileUpload(
                '[data-test-file-input="routes"] input',
                ['test'],
                {name: 'routes-bad.yaml', type: 'application/x-yaml'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // shows failure button
            // button = find('[data-test-button="upload-routes"]');
            // expect(button.length, 'no of failure buttons').to.equal(1);
            // expect(
            //     button.hasClass('gh-btn-red'),
            //     'failure button is red'
            // ).to.be.true;
            // expect(
            //     button.text().trim(),
            //     'failure button text'
            // ).to.have.string('Upload Failed');
            //
            // await wait();

            // shows error message
            expect(
                find('[data-test-error="routes"]').textContent,
                'routes upload error text'
            ).to.have.string('Test failure message');

            // returned to normal button
            buttons = findAll('[data-test-button="upload-routes"]');
            expect(buttons.length, 'no of post-failure buttons').to.equal(1);
            expect(
                buttons[0],
                'routes post-failure button doesn\'t have failure class'
            ).to.not.have.class('gh-btn-red');
            expect(
                buttons[0].textContent,
                'routes post-failure button text'
            ).to.have.string('Upload routes YAML');

            // successful upload clears error
            this.server.post('/settings/routes/yaml/', {}, 200);
            await fileUpload(
                '[data-test-file-input="routes"] input',
                ['test'],
                {name: 'routes-good.yaml', type: 'application/x-yaml'}
            );

            expect(find('[data-test-error="routes"]')).to.not.exist;

            // can download redirects.json
            await click('[data-test-link="download-routes"]');

            let iframe = document.querySelector('#iframeDownload');
            expect(iframe.getAttribute('src')).to.have.string('/settings/routes/yaml/');
        });

        it('does not display lexical feedback textarea by default', async function () {
            disableLabsFlag(this.server, 'lexicalEditor');
            await visit('/settings/labs');

            expect(find('[data-test-lexical-feedback-textarea]')).to.not.exist;
            expect(find('[data-test-toggle="labs-lexicalEditor"]')).to.exist;
        });

        it('display lexical feedback textarea when the labs setting is enabled and then disabled', async function () {
            disableLabsFlag(this.server, 'lexicalEditor');
            // - The feedback form UI is hidden by default
            // - Enabling “Lexical editor” doesn’t show the feedback form
            // - Disabling “Lexical editor” shows the feedback form below this lab item and user can send the feedback
            // - Refreshing the page or navigating to some other page and then back to Labs → the form is hidden again
            await visit('/settings/labs');

            // hidden by default
            expect(find('[data-test-lexical-feedback-textarea]')).to.not.exist;

            // hidden when flag is enabled
            await click('[data-test-toggle="labs-lexicalEditor"]');
            expect(find('[name="labs[lexicalEditor]"]').checked, 'Lexical editor toggle').to.be.true;
            expect(find('[data-test-lexical-feedback-textarea]')).to.not.exist;

            // display when flag is disabled
            await click('[data-test-toggle="labs-lexicalEditor"]');
            expect(find('[name="labs[lexicalEditor]"]').checked, 'Lexical editor toggle').to.be.false;
            expect(find('[data-test-lexical-feedback-textarea]')).to.exist;

            // navigate to main and return to settings, feedback should be hidden
            await visit('/');
            await visit('/settings/labs');
            expect(find('[data-test-lexical-feedback-textarea]')).to.not.exist;
        });

        it('allows the user to send lexical feedback', async function () {
            enableLabsFlag(this.server, 'lexicalEditor');
            // mock successful request
            this.server.post('https://submit-form.com/us6uBWv8', {}, 200);

            await visit('/settings/labs');

            // disable flag
            await click('[name="labs[lexicalEditor]"]');
            expect(find('[name="labs[lexicalEditor]"]').checked, 'Lexical editor toggle').to.be.false;

            await fillIn('[data-test-lexical-feedback-textarea]', 'This is test feedback');
            await click('[data-test-button="submit-lexical-feedback"]');

            // successful request will show a notification toast
            expect(find('[data-test-text="notification-content"]')).to.exist;
        });
    });

    describe('When logged in as Owner', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it.skip('sets the mailgunBaseUrl to the default', async function () {
            await visit('/settings/members');

            await fillIn('[data-test-mailgun-api-key-input]', 'i_am_an_api_key');
            await fillIn('[data-test-mailgun-domain-input]', 'https://domain.tld');

            await click('[data-test-button="save-members-settings"]');

            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);

            expect(params.settings.findBy('key', 'mailgun_base_url').value).not.to.equal(null);
        });
    });
});
