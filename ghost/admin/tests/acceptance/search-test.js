import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentURL, find, findAll, triggerKeyEvent, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getPosts} from '../../mirage/config/posts';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {typeInSearch} from 'ember-power-select/test-support/helpers';

const SEARCH_BUTTON = '[data-test-button="search"]';
const SEARCH_MODAL = '[data-test-modal="search"]';
const SEARCH_TRIGGER = '[data-test-modal="search"] .ember-power-select-trigger';
const MODAL_BACKDROP = '.epm-backdrop';
const GROUP_NAME = '.ember-power-select-group-name';
const SEARCH_OPTION = '.ember-power-select-option';
const SEARCH_OPTION_TITLE = '.gh-nav-search-option > div:first-child';
const NO_RESULTS_MESSAGE = '.ember-power-select-option--no-matches-message';
const SELECTED_OPTION = '.ember-power-select-option[aria-current="true"]';
const HIGHLIGHTED_TEXT = '.ember-power-select-option[aria-current="true"] .highlight';

// Assertion helpers
const assertSearchModalOpen = () => {
    expect(find(SEARCH_MODAL), 'search modal should be open').to.exist;
};

const assertSearchModalClosed = () => {
    expect(find(SEARCH_MODAL), 'search modal should be closed').to.not.exist;
};

// Helper functions for common test operations
const openSearch = async () => {
    await click(SEARCH_BUTTON);
    assertSearchModalOpen();
};

const openSearchWithKeyboard = async () => {
    await triggerKeyEvent(document, 'keydown', 'K', {
        metaKey: ctrlOrCmd === 'command',
        ctrlKey: ctrlOrCmd === 'ctrl'
    });
    assertSearchModalOpen();
};

const closeSearchWithEscape = async () => {
    await triggerKeyEvent(document, 'keydown', 'Escape');
    assertSearchModalClosed();
};

const closeSearchWithBackdrop = async () => {
    await click(MODAL_BACKDROP);
    assertSearchModalClosed();
};

const searchFor = async (query) => {
    await typeInSearch(query);
};

const selectWithEnter = async () => {
    await triggerKeyEvent(SEARCH_TRIGGER, 'keydown', 'Enter');
};

const selectWithClick = async () => {
    await click(SELECTED_OPTION);
};

const navigateDown = async () => {
    await triggerKeyEvent(SEARCH_TRIGGER, 'keyup', 'ArrowDown');
};

const navigateUp = async () => {
    await triggerKeyEvent(SEARCH_TRIGGER, 'keyup', 'ArrowUp');
};

const getSearchGroups = () => {
    return findAll(GROUP_NAME);
};

const getSearchOptions = () => {
    return findAll(SEARCH_OPTION);
};

// Helper to extract title text without status labels
const getTitleText = (option) => {
    const titleDiv = option.querySelector(SEARCH_OPTION_TITLE);
    return titleDiv ? titleDiv.textContent.trim() : option.textContent.trim();
};

const createTestData = function (server) {
    return {
        user: server.create('user', {
            roles: [server.create('role', {name: 'Owner'})],
            slug: 'owner',
            name: 'First user'
        }),
        firstPost: server.create('post', {title: 'First post', slug: 'first-post'}),
        secondPost: server.create('post', {title: 'Second post', slug: 'second-post'}),
        firstPage: server.create('page', {title: 'First page', slug: 'first-page'}),
        firstTag: server.create('tag', {name: 'First tag', slug: 'first-tag'})
    };
};

describe('Acceptance: Search', function () {
    describe('FlexSearch Provider', function () {
        const hooks = setupApplicationTest();
        setupMirage(hooks);

        let testData;

        beforeEach(async function () {
            this.server.loadFixtures();
            testData = createTestData(this.server);

            // Default locale is 'en' - uses flex search
            mockAnalyticsApps();
            await authenticateSession();
        });

        afterEach(function () {
            cleanupMockAnalyticsApps();
        });

        it('uses FlexSearch provider for English locale', async function () {
            await visit('/analytics');

            const searchService = this.owner.lookup('service:search');
            expect(searchService.provider.constructor.name).to.equal('SearchProviderFlexService');
        });

        it('opens search modal when clicking search icon', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearch();
        });

        it('opens search modal with keyboard shortcut Ctrl/Cmd+K', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearchWithKeyboard();
        });

        it('closes search modal with Escape key', async function () {
            await visit('/analytics');
            await openSearch();
            await closeSearchWithEscape();
        });

        it('closes search modal when clicking outside', async function () {
            await visit('/analytics');
            await openSearch();
            await closeSearchWithBackdrop();
        });

        it('finds all content types when searching for "first"', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            const groupNames = getSearchGroups();
            expect(groupNames).to.have.length(4);
            expect(groupNames[0].textContent.trim()).to.equal('Staff');
            expect(groupNames[1].textContent.trim()).to.equal('Tags');
            expect(groupNames[2].textContent.trim()).to.equal('Posts');
            expect(groupNames[3].textContent.trim()).to.equal('Pages');

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            expect(getTitleText(searchOptions[0])).to.equal('First user');
            expect(getTitleText(searchOptions[1])).to.equal('First tag');
            expect(getTitleText(searchOptions[2])).to.equal('First post');
            expect(getTitleText(searchOptions[3])).to.equal('First page');

            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');
        });

        it('shows "No results found" when search has no matches', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('xyz123nonexistent');

            const noResultsMessage = find(NO_RESULTS_MESSAGE);
            expect(noResultsMessage).to.exist;
            expect(noResultsMessage.textContent).to.contain('No results found');
        });

        it('handles slow search requests gracefully', async function () {
            this.server.get('/posts/', getPosts, {timing: 200});

            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            expect(getTitleText(searchOptions[0])).to.equal('First user');
            expect(getTitleText(searchOptions[1])).to.equal('First tag');
            expect(getTitleText(searchOptions[2])).to.equal('First post');
            expect(getTitleText(searchOptions[3])).to.equal('First page');
        });

        it('navigates search results with arrow keys', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            const searchOptions = getSearchOptions();

            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');

            await navigateDown();
            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');

            await navigateUp();
            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');
        });

        it('navigates to post editor when selecting a post with Enter', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates to post editor when clicking a post', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            await selectWithClick();

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates when clicking highlighted text in search result', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            const highlightedText = find(HIGHLIGHTED_TEXT);
            expect(highlightedText).to.exist;
            await click(highlightedText);

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates to page editor when selecting a page', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('page');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/editor/page/${testData.firstPage.id}`);
        });

        it('navigates to tag settings when selecting a tag', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('tag');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/tags/${testData.firstTag.slug}`);
        });

        // Staff settings are now part of AdminX
        it.skip('navigates to user settings when selecting a user', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('user');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/settings/staff/${testData.user.slug}`);
        });
    });

    describe('BasicSearch Provider', function () {
        const hooks = setupApplicationTest();
        setupMirage(hooks);

        let testData;

        beforeEach(async function () {
            this.server.loadFixtures();
            testData = createTestData(this.server);

            // German locale uses basic search
            this.server.db.settings.update({key: 'locale'}, {value: 'de'});
            mockAnalyticsApps();
            await authenticateSession();
        });

        afterEach(function () {
            cleanupMockAnalyticsApps();
        });

        it('uses BasicSearch provider for non-English locale', async function () {
            await visit('/analytics');

            const settingsService = this.owner.lookup('service:settings');
            expect(settingsService.locale).to.equal('de');

            const searchService = this.owner.lookup('service:search');
            expect(searchService.provider.constructor.name).to.equal('SearchProviderBasicService');
        });

        it('opens search modal when clicking search icon', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearch();
        });

        it('opens search modal with keyboard shortcut Ctrl/Cmd+K', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearchWithKeyboard();
        });

        it('closes search modal with Escape key', async function () {
            await visit('/analytics');
            await openSearch();
            await closeSearchWithEscape();
        });

        it('closes search modal when clicking outside', async function () {
            await visit('/analytics');
            await openSearch();
            await closeSearchWithBackdrop();
        });

        it('finds all content types when searching for "first"', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            const groupNames = getSearchGroups();
            expect(groupNames).to.have.length(4);
            expect(groupNames[0].textContent.trim()).to.equal('Staff');
            expect(groupNames[1].textContent.trim()).to.equal('Tags');
            expect(groupNames[2].textContent.trim()).to.equal('Posts');
            expect(groupNames[3].textContent.trim()).to.equal('Pages');

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            expect(getTitleText(searchOptions[0])).to.equal('First user');
            expect(getTitleText(searchOptions[1])).to.equal('First tag');
            expect(getTitleText(searchOptions[2])).to.equal('First post');
            expect(getTitleText(searchOptions[3])).to.equal('First page');

            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');
        });

        it('shows "No results found" when search has no matches', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('xyz123nonexistent');

            const noResultsMessage = find(NO_RESULTS_MESSAGE);
            expect(noResultsMessage).to.exist;
            expect(noResultsMessage.textContent).to.contain('No results found');
        });

        it('handles slow search requests gracefully', async function () {
            this.server.get('/posts/', getPosts, {timing: 200});

            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            expect(getTitleText(searchOptions[0])).to.equal('First user');
            expect(getTitleText(searchOptions[1])).to.equal('First tag');
            expect(getTitleText(searchOptions[2])).to.equal('First post');
            expect(getTitleText(searchOptions[3])).to.equal('First page');
        });

        it('navigates search results with arrow keys', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            const searchOptions = getSearchOptions();

            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');

            await navigateDown();
            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');

            await navigateUp();
            expect(searchOptions[0].getAttribute('aria-current')).to.equal('true');
        });

        it('navigates to post editor when selecting a post with Enter', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates to post editor when clicking a post', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            await selectWithClick();

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates when clicking highlighted text in search result', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first post');

            const highlightedText = find(HIGHLIGHTED_TEXT);
            expect(highlightedText).to.exist;
            await click(highlightedText);

            expect(currentURL()).to.equal(`/editor/post/${testData.firstPost.id}`);
        });

        it('navigates to page editor when selecting a page', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('page');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/editor/page/${testData.firstPage.id}`);
        });

        it('navigates to tag settings when selecting a tag', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('tag');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/tags/${testData.firstTag.slug}`);
        });

        // Staff settings are now part of AdminX
        it.skip('navigates to user settings when selecting a user', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('user');

            await selectWithEnter();

            expect(currentURL()).to.equal(`/settings/staff/${testData.user.slug}`);
        });
    });
});