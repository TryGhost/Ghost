import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, fillIn, find, waitFor, waitUntil} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {enableMembers} from '../../helpers/members';
import {enableStripe} from '../../helpers/stripe';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support/helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

const PAYWALL_LEXICAL = JSON.stringify({
    root: {
        children: [{
            type: 'paywall',
            version: 1
        }],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

describe('Acceptance: Editor / Visibility', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    let author;

    beforeEach(async function () {
        this.server.loadFixtures();

        let role = this.server.create('role', {name: 'Administrator'});
        author = this.server.create('user', {roles: [role]});

        enableMembers(this.server);

        await authenticateSession();
    });

    // Access is what the reader is let past, so it moves onto the post itself
    // and out of the settings drawer - next to the paywall it governs
    it('moves access out of the sidebar and onto the post with paywallV2 on', async function () {
        enableLabsFlag(this.server, 'paywallV2');

        const post = this.server.create('post', {authors: [author], status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        expect(find('[data-test-button="post-access-chip"]'), 'access chip').to.exist;
        expect(find('[data-test-text="post-access-chip"]')).to.have.trimmed.text('Public');

        await click('[data-test-psm-trigger]');
        expect(find('[data-test-select="post-visibility"]'), 'sidebar access').to.not.exist;
    });

    it('changes access from the chip', async function () {
        enableLabsFlag(this.server, 'paywallV2');

        const post = this.server.create('post', {authors: [author], status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        await click('[data-test-button="post-access-chip"]');
        await click('[data-test-access-option="paid"]');

        // the chip states the level as the bare noun in both placements - the
        // menu it came from is where "Paid members only" is spelled out
        expect(find('[data-test-text="post-access-chip"]')).to.have.trimmed.text('Paid');

        const putRequests = this.server.pretender.handledRequests.filter(
            req => req.method === 'PUT' && req.url.includes('/posts/')
        );
        const lastPut = JSON.parse(putRequests[putRequests.length - 1].requestBody);
        expect(lastPut.posts[0].visibility, 'visibility in PUT request').to.equal('paid');
    });

    // One tier is worth naming; several are only worth counting
    it('names a single tier and counts the rest', async function () {
        enableLabsFlag(this.server, 'paywallV2');

        const premium = this.server.create('tier', {name: 'Premium', type: 'paid'});

        const post = this.server.create('post', {authors: [author], status: 'draft'});

        await visit(`/editor/post/${post.id}`);

        // The tier picker opens under the level rather than behind a second
        // step, so the menu stays open throughout. Tier-gating starts on the
        // first tier, because a post gated on none of them won't save.
        await click('[data-test-button="post-access-chip"]');
        await click('[data-test-access-option="tiers"]');
        expect(find('[data-test-access-tiers]'), 'tier picker').to.exist;
        expect(find('[data-test-text="post-access-chip"]')).to.have.trimmed.text('Default Tier');

        await selectChoose('[data-test-access-tiers] .ember-power-select-trigger', premium.name);
        expect(find('[data-test-text="post-access-chip"]')).to.have.trimmed.text('2 tiers');

        // picking tiers must not close the menu out from under the author
        expect(find('[data-test-access-tiers]'), 'tier picker still open').to.exist;
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

    it('reflects post access and updates when access changes', async function () {
        enableLabsFlag(this.server, 'paywallImprovements');

        const post = this.server.create('post', {
            authors: [author],
            lexical: PAYWALL_LEXICAL,
            status: 'draft',
            visibility: 'public'
        });

        await visit(`/editor/post/${post.id}`);
        await waitFor('[data-kg-card="paywall"]');

        const paywallCard = () => find('[data-kg-card="paywall"]');
        const waitForPaywallLabel = label => waitUntil(() => paywallCard().textContent.includes(label));

        expect(paywallCard()).to.contain.text('Public preview · No effect while post is public');

        await click('[data-test-psm-trigger]');

        await fillIn('[data-test-select="post-visibility"]', 'members');
        await waitForPaywallLabel('Members only');

        await fillIn('[data-test-select="post-visibility"]', 'paid');
        await waitForPaywallLabel('Paid members only');

        const tier = this.server.create('tier', {name: 'Premium'});
        const tierPost = this.server.create('post', {
            authors: [author],
            lexical: PAYWALL_LEXICAL,
            status: 'draft',
            tiers: [tier],
            visibility: 'tiers'
        });

        await visit(`/editor/post/${tierPost.id}`);
        await waitFor('[data-kg-card="paywall"]');

        expect(find('[data-kg-card="paywall"]')).to.contain.text('Selected tiers only');
    });
});
