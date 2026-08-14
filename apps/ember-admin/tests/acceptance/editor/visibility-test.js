import {authenticateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../../helpers/mock-analytics-apps';
import {click, fillIn, find} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableMembers} from '../../helpers/members';
import {enableStripe} from '../../helpers/stripe';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Editor / Visibility', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    let author;

    beforeEach(async function () {
        mockAnalyticsApps();
        this.server.loadFixtures();

        let role = this.server.create('role', {name: 'Administrator'});
        author = this.server.create('user', {roles: [role]});

        enableMembers(this.server);

        await authenticateSession();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    it('can change visibility to members only', async function () {
        let post = this.server.create('post', {authors: [author], status: 'draft'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-psm-trigger]');

        let visibilitySelect = find('[data-test-select="post-visibility"]');
        expect(visibilitySelect.value, 'initial visibility').to.equal('public');

        await fillIn('[data-test-select="post-visibility"]', 'members');

        post = this.server.db.posts.find(post.id);
        expect(post.visibility, 'saved visibility').to.equal('members');
    });

    it('can change visibility to paid members only', async function () {
        let post = this.server.create('post', {authors: [author], status: 'draft'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-psm-trigger]');

        await fillIn('[data-test-select="post-visibility"]', 'paid');

        post = this.server.db.posts.find(post.id);
        expect(post.visibility, 'saved visibility').to.equal('paid');
    });

    it('shows tier selector when visibility is set to tiers', async function () {
        enableStripe(this.server);
        let post = this.server.create('post', {authors: [author], status: 'draft'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-psm-trigger]');

        expect(find('[data-test-visibility-segment-select]'), 'tier selector before').to.not.exist;

        await fillIn('[data-test-select="post-visibility"]', 'tiers');

        expect(find('[data-test-visibility-segment-select]'), 'tier selector after').to.exist;
    });

    it('saves visibility change to API', async function () {
        let post = this.server.create('post', {authors: [author], status: 'draft'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-psm-trigger]');
        await fillIn('[data-test-select="post-visibility"]', 'paid');

        // Verify the PUT request was made with the correct visibility
        let putRequests = this.server.pretender.handledRequests.filter(
            req => req.method === 'PUT' && req.url.includes('/posts/')
        );
        let lastPut = putRequests[putRequests.length - 1];
        let requestBody = JSON.parse(lastPut.requestBody);
        expect(requestBody.posts[0].visibility, 'visibility in PUT request').to.equal('paid');
    });
});
