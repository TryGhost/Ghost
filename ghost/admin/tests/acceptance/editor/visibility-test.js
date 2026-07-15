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

function publicPreviewLexical() {
    return JSON.stringify({
        root: {
            children: [
                {
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                },
                {type: 'paywall', version: 1},
                {
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
}

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

    it('resolves public preview access from inside the editor', async function () {
        let post = this.server.create('post', {authors: [author], lexical: publicPreviewLexical(), status: 'draft', visibility: 'public'});

        await visit(`/editor/post/${post.id}`);

        expect(find('[data-kg-public-preview-unresolved="true"]'), 'unresolved public preview').to.exist;
        expect(find('[data-kg-public-preview-access-option="members"]'), 'members access option').to.exist;

        await click('[data-kg-public-preview-access-option="members"]');

        post = this.server.db.posts.find(post.id);
        expect(post.visibility, 'saved visibility').to.equal('members');
        expect(find('[data-kg-public-preview-unresolved="true"]'), 'resolved public preview').to.not.exist;
    });

    it('returns publishing to an unresolved public preview', async function () {
        const post = this.server.create('post', {authors: [author], lexical: publicPreviewLexical(), status: 'draft', visibility: 'public'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        expect(find('[data-test-modal="publish-flow"]'), 'publish flow before access is chosen').to.not.exist;
        expect(document.activeElement, 'focused access option').to.equal(find('[data-kg-public-preview-access-option="members"]'));

        await click('[data-kg-public-preview-access-option="members"]');
        await click('[data-test-button="publish-flow"]');

        expect(find('[data-test-modal="publish-flow"]'), 'publish flow after access is chosen').to.exist;
    });
});
