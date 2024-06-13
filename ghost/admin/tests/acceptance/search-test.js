import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find, findAll, triggerKeyEvent, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {getPosts} from '../../mirage/config/posts';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {typeInSearch} from 'ember-power-select/test-support/helpers';

const suites = [{
    name: 'Acceptance: Search',
    beforeEach() {
        // noop
    }
}, {
    name: 'Acceptance: Search (beta)',
    beforeEach() {
        enableLabsFlag(this.server, 'internalLinking');
    }
}];

suites.forEach((suite) => {
    describe(suite.name, function () {
        const trigger = '[data-test-modal="search"] .ember-power-select-trigger';
        // eslint-disable-next-line no-unused-vars
        let firstUser, firstPost, secondPost, firstPage, firstTag;

        const hooks = setupApplicationTest();
        setupMirage(hooks);

        this.beforeEach(async function () {
            this.server.loadFixtures();

            // create user to authenticate as
            let role = this.server.create('role', {name: 'Owner'});
            firstUser = this.server.create('user', {roles: [role], slug: 'owner', name: 'First user'});

            // populate store with data we'll be searching
            firstPost = this.server.create('post', {title: 'First post', slug: 'first-post'});
            secondPost = this.server.create('post', {title: 'Second post', slug: 'second-post'});
            firstPage = this.server.create('page', {title: 'First page', slug: 'first-page'});
            firstTag = this.server.create('tag', {name: 'First tag', slug: 'first-tag'});

            suite.beforeEach.bind(this)();

            return await authenticateSession();
        });

        it('opens search modal when clicking icon', async function () {
            await visit('/dashboard');
            expect(currentURL(), 'currentURL').to.equal('/dashboard');
            expect(find('[data-test-modal="search"]'), 'search modal').to.not.exist;
            await click('[data-test-button="search"]');
            expect(find('[data-test-modal="search"]'), 'search modal').to.exist;
        });

        it('opens search icon when pressing Ctrl/Cmd+K', async function () {
            await visit('/dashboard');
            expect(find('[data-test-modal="search"]'), 'search modal').to.not.exist;
            await triggerKeyEvent(document, 'keydown', 'K', {
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });
            expect(find('[data-test-modal="search"]'), 'search modal').to.exist;
        });

        it('closes search modal on escape key', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            expect(find('[data-test-modal="search"]'), 'search modal').to.exist;
            await triggerKeyEvent(document, 'keydown', 'Escape');
            expect(find('[data-test-modal="search"]'), 'search modal').to.not.exist;
        });

        it('closes search modal on click outside', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            expect(find('[data-test-modal="search"]'), 'search modal').to.exist;
            await click('.epm-backdrop');
            expect(find('[data-test-modal="search"]'), 'search modal').to.not.exist;
        });

        it('finds posts, pages, staff, and tags when typing', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('first'); // search is not case sensitive

            // all groups are present
            const groupNames = findAll('.ember-power-select-group-name');
            expect(groupNames, 'group names').to.have.length(4);
            expect(groupNames.map(el => el.textContent.trim())).to.deep.equal(['Staff', 'Tags', 'Posts', 'Pages']);

            // correct results are found
            const options = findAll('.ember-power-select-option');
            expect(options, 'number of search results').to.have.length(4);
            expect(options.map(el => el.textContent.trim())).to.deep.equal(['First user', 'First tag', 'First post', 'First page']);

            // first item is selected
            expect(options[0]).to.have.attribute('aria-current', 'true');
        });

        it('up/down arrows move selected item', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('first post');
            expect(findAll('.ember-power-select-option')[0], 'first option (initial)').to.have.attribute('aria-current', 'true');
            await triggerKeyEvent(trigger, 'keyup', 'ArrowDown');
            expect(findAll('.ember-power-select-option')[0], 'second option (after down)').to.have.attribute('aria-current', 'true');
            await triggerKeyEvent(trigger, 'keyup', 'ArrowUp');
            expect(findAll('.ember-power-select-option')[0], 'first option (after up)').to.have.attribute('aria-current', 'true');
        });

        it('navigates to editor when post selected (Enter)', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('first post');
            await triggerKeyEvent(trigger, 'keydown', 'Enter');
            expect(currentURL(), 'url after selecting post').to.equal(`/editor/post/${firstPost.id}`);
        });

        it('navigates to editor when post selected (Clicked)', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('first post');
            await click('.ember-power-select-option[aria-current="true"]');
            expect(currentURL(), 'url after selecting post').to.equal(`/editor/post/${firstPost.id}`);
        });

        it('navigates to editor when page selected', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('page');
            await triggerKeyEvent(trigger, 'keydown', 'Enter');
            expect(currentURL(), 'url after selecting page').to.equal(`/editor/page/${firstPage.id}`);
        });

        it('navigates to tag edit screen when tag selected', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('tag');
            await triggerKeyEvent(trigger, 'keydown', 'Enter');
            expect(currentURL(), 'url after selecting tag').to.equal(`/tags/${firstTag.slug}`);
        });

        // TODO: Staff settings are now part of AdminX so this isn't working, can we test AdminX from Ember tests?
        it.skip('navigates to user edit screen when user selected', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('user');
            await triggerKeyEvent(trigger, 'keydown', 'Enter');
            expect(currentURL(), 'url after selecting user').to.equal(`/settings/staff/${firstUser.slug}`);
        });

        it('shows no results message when no results', async function () {
            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('x');
            expect(find('.ember-power-select-option--no-matches-message'), 'no results message').to.contain.text('No results found');
        });

        // https://linear.app/tryghost/issue/MOM-103/search-stalls-on-query-when-refresh-occurs
        it('handles refresh on first search being slow', async function () {
            this.server.get('/posts/', getPosts, {timing: 200});

            await visit('/dashboard');
            await click('[data-test-button="search"]');
            await typeInSearch('first'); // search is not case sensitive

            // all groups are present
            const groupNames = findAll('.ember-power-select-group-name');
            expect(groupNames, 'group names').to.have.length(4);
            expect(groupNames.map(el => el.textContent.trim())).to.deep.equal(['Staff', 'Tags', 'Posts', 'Pages']);

            // correct results are found
            const options = findAll('.ember-power-select-option');
            expect(options, 'number of search results').to.have.length(4);
            expect(options.map(el => el.textContent.trim())).to.deep.equal(['First user', 'First tag', 'First post', 'First page']);

            // first item is selected
            expect(options[0]).to.have.attribute('aria-current', 'true');
        });
    });
});
