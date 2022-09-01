import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';
// import wait from 'ember-test-helpers/wait';
// import {timeout} from 'ember-concurrency';

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

        it.skip('it renders, loads modals correctly', async function () {
            await visit('/settings/labs');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

            // highlights nav menu
            expect(find('[data-test-nav="labs"]'), 'highlights nav menu item')
                .to.have.class('active');

            await click('#settings-resetdb .js-delete');
            expect(findAll('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);

            await click('.fullscreen-modal .modal-footer .gh-btn');
            expect(findAll('.fullscreen-modal').length, 'modal element').to.equal(0);
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
