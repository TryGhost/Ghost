import {Response} from 'miragejs';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentRouteName, fillIn, find, findAll, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {versionMismatchResponse} from 'ghost-admin/mirage/utils';

let htmlErrorResponse = function () {
    return new Response(
        504,
        {'Content-Type': 'text/html'},
        '<!DOCTYPE html><head><title>Server Error</title></head><body>504 Gateway Timeout</body></html>'
    );
};

describe('Acceptance: Error Handling', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('VersionMismatch errors', function () {
        describe('logged in', function () {
            beforeEach(async function () {
                let role = this.server.create('role', {name: 'Administrator'});
                this.server.create('user', {roles: [role]});

                return await authenticateSession();
            });

            it('displays an alert and disables navigation when saving', async function () {
                this.server.createList('post', 3);

                // mock the post save endpoint to return version mismatch
                this.server.put('/posts/:id', versionMismatchResponse);

                await visit('/posts');
                await click('.posts-list li:nth-of-type(1) a'); // select first draft post (otherwise no automatic saving on blur)
                await fillIn('[data-test-editor-title-input]', 'Updated post');
                await blur('[data-test-editor-title-input]');

                // has the refresh to update alert
                expect(findAll('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').textContent).to.match(/refresh/);

                // try navigating back to the content list
                await click('[data-test-link="posts"]');

                expect(currentRouteName()).to.equal('editor.edit');
            });

            it('displays alert and aborts the transition when navigating', async function () {
                await visit('/posts');

                // mock the tags endpoint to return version mismatch
                this.server.get('/tags/', versionMismatchResponse);

                await click('[data-test-nav="tags"]');

                // navigation is blocked on loading screen
                expect(currentRouteName()).to.equal('tags_loading');

                // has the refresh to update alert
                expect(findAll('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').textContent).to.match(/refresh/);
            });
        });

        describe('logged out', function () {
            it('displays alert', async function () {
                this.server.post('/session', versionMismatchResponse);

                await visit('/signin');
                await fillIn('[name="identification"]', 'test@example.com');
                await fillIn('[name="password"]', 'password');
                await click('[data-test-button="sign-in"]');

                // has the refresh to update alert
                expect(findAll('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').textContent).to.match(/refresh/);
            });
        });
    });

    describe('CloudFlare errors', function () {
        beforeEach(async function () {
            this.server.loadFixtures();

            let roles = this.server.schema.roles.where({name: 'Administrator'});
            this.server.create('user', {roles});

            return await authenticateSession();
        });

        it('handles Ember Data HTML response', async function () {
            this.server.put('/posts/1/', htmlErrorResponse);
            this.server.create('post');

            await visit('/editor/post/1');
            await fillIn('[data-test-editor-title-input]', 'Updated post');
            await blur('[data-test-editor-title-input]');

            expect(findAll('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').textContent).to.not.match(/html>/);
            expect(find('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
        });

        it('handles ember-ajax HTML response', async function () {
            this.server.del('/themes/foo/', htmlErrorResponse);

            await visit('/settings/design/change-theme');

            await click('[data-test-button="toggle-advanced"]');
            await click('[data-test-theme-id="foo"] [data-test-button="actions"]');
            await click('[data-test-actions-for="foo"] [data-test-button="delete"]');
            await click('[data-test-modal="delete-theme"] [data-test-button="confirm"]');

            expect(findAll('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').textContent).to.not.match(/html>/);
            expect(find('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
        });
    });
});
