import {Response} from 'miragejs';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, fillIn, find, findAll, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

const htmlErrorResponse = function () {
    return new Response(
        504,
        {'Content-Type': 'text/html'},
        '<!DOCTYPE html><head><title>Server Error</title></head><body>504 Gateway Timeout</body></html>'
    );
};

describe('Acceptance: Error Handling', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('CloudFlare errors', function () {
        beforeEach(async function () {
            this.server.loadFixtures();

            const roles = this.server.schema.roles.where({name: 'Administrator'});
            this.server.create('user', {roles});

            await authenticateSession();
        });

        it('handles Ember Data HTML response', async function () {
            this.server.put('/posts/1/', htmlErrorResponse);
            this.server.create('post');

            await visit('/editor/post/1');
            await fillIn('[data-test-editor-title-input]', 'Updated post');
            await blur('[data-test-editor-title-input]');

            expect(findAll('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').textContent).to.not.match(/html>/);
            expect(find('.gh-alert').textContent).to.match(/An unexpected error occurred, please try again./);
        });
    });
});
