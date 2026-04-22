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
    // Power Select needs keydown events on the search input, not the trigger
    const searchInput = find('.ember-power-select-search-input');
    if (searchInput) {
        await triggerKeyEvent(searchInput, 'keydown', 'ArrowDown');
    } else {
        await triggerKeyEvent(SEARCH_TRIGGER, 'keydown', 'ArrowDown');
    }
};

const navigateUp = async () => {
    // Power Select needs keydown events on the search input, not the trigger
    const searchInput = find('.ember-power-select-search-input');
    if (searchInput) {
        await triggerKeyEvent(searchInput, 'keydown', 'ArrowUp');
    } else {
        await triggerKeyEvent(SEARCH_TRIGGER, 'keydown', 'ArrowUp');
    }
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

// Assertion helpers for search results
const assertSearchGroups = (expectedGroups = ['Staff', 'Tags', 'Posts', 'Pages']) => {
    const groupNames = getSearchGroups();
    expect(groupNames).to.have.length(expectedGroups.length);
    expectedGroups.forEach((groupName, index) => {
        expect(groupNames[index].textContent.trim()).to.equal(groupName);
    });
};

const assertSearchResults = (expectedTitles) => {
    const searchOptions = getSearchOptions();
    expect(searchOptions).to.have.length(expectedTitles.length);

    expectedTitles.forEach((title, index) => {
        expect(getTitleText(searchOptions[index])).to.equal(title);
    });

    return searchOptions; // Return for further assertions if needed
};

const assertResultSelected = (index = 0) => {
    const searchOptions = getSearchOptions();
    expect(searchOptions[index].getAttribute('aria-current')).to.equal('true');
};

const assertSelectedText = (expectedText) => {
    const selectedOption = find(SELECTED_OPTION);
    expect(selectedOption, 'selected option should exist').to.exist;
    expect(getTitleText(selectedOption)).to.equal(expectedText);
};

const assertResultHasStatus = (resultIndex, expectedStatus) => {
    const searchOptions = getSearchOptions();
    const statusLabel = searchOptions[resultIndex].querySelector('.gh-nav-search-label');
    if (expectedStatus) {
        expect(statusLabel, `result at index ${resultIndex} should have status label`).to.exist;
        expect(statusLabel.textContent.trim()).to.equal(expectedStatus);
        // Check the status has the correct class
        if (expectedStatus === 'Draft') {
            expect(statusLabel.classList.contains('draft')).to.be.true;
        } else if (expectedStatus === 'Scheduled') {
            expect(statusLabel.classList.contains('scheduled')).to.be.true;
        }
    } else {
        expect(statusLabel, `result at index ${resultIndex} should not have status label`).to.not.exist;
    }
};

const assertNoResults = () => {
    const noResultsMessage = find(NO_RESULTS_MESSAGE);
    expect(noResultsMessage).to.exist;
    expect(noResultsMessage.textContent).to.contain('No results found');
};

const createTestData = function (server) {
    return {
        user: server.create('user', {
            roles: [server.create('role', {name: 'Owner'})],
            slug: 'owner',
            name: 'First user'
        }),
        firstPost: server.create('post', {title: 'First post', slug: 'first-post', status: 'draft'}),
        secondPost: server.create('post', {title: 'Second post', slug: 'second-post'}),
        firstPage: server.create('page', {title: 'First page', slug: 'first-page', status: 'draft'}),
        firstTag: server.create('tag', {name: 'First tag', slug: 'first-tag'}),
        draftPost: server.create('post', {title: 'Draft post', slug: 'draft-post', status: 'draft'}),
        scheduledPost: server.create('post', {title: 'Scheduled post', slug: 'scheduled-post', status: 'scheduled', publishedAt: new Date(Date.now() + 86400000).toISOString()}),
        publishedPost: server.create('post', {title: 'Published post', slug: 'published-post', status: 'published', publishedAt: new Date(Date.now() - 86400000).toISOString()})
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

        it('opens search modal with Ctrl/Cmd+K', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearch();
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

            assertSearchGroups();
            assertSearchResults(['First user', 'First tag', 'First post', 'First page']);
            assertResultSelected(0);
        });

        it('shows "No results found" when search has no matches', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('xyz123nonexistent');

            assertNoResults();
        });

        it('handles slow search requests gracefully', async function () {
            this.server.get('/posts/', getPosts, {timing: 200});

            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            assertSearchResults(['First user', 'First tag', 'First post', 'First page']);
        });

        it('navigates search results with arrow keys', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first'); // Get multiple results

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            // First item should be selected by default
            assertSelectedText('First user');

            // Navigate down should move to second item
            await navigateDown();
            assertSelectedText('First tag');

            // Navigate up should move back to first item
            await navigateUp();
            assertSelectedText('First user');
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

        it('shows status labels for draft and scheduled posts', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('post');

            const searchOptions = getSearchOptions();

            // Posts are sorted by status priority: scheduled > draft > published > sent
            // We created: 1 scheduled, 1 draft, 2 published posts
            // So the order should be: Scheduled post, Draft post, First post, Published post

            // Verify scheduled post appears first with Scheduled label
            expect(getTitleText(searchOptions[0])).to.equal('Scheduled post');
            assertResultHasStatus(0, 'Scheduled');

            // Verify draft post appears second with Draft label
            expect(getTitleText(searchOptions[1])).to.equal('First post');
            assertResultHasStatus(1, 'Draft');
            expect(getTitleText(searchOptions[2])).to.equal('Draft post');
            assertResultHasStatus(2, 'Draft');

            // Verify published posts have no status label
            expect(getTitleText(searchOptions[3])).to.equal('Second post');
            assertResultHasStatus(3, null);

            expect(getTitleText(searchOptions[4])).to.equal('Published post');
            assertResultHasStatus(4, null);
        });

        it('shows status label for draft page', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('First page');

            const searchOptions = getSearchOptions();

            // First page should be a draft
            const pageOption = searchOptions[0];
            expect(getTitleText(pageOption)).to.equal('First page');
            assertResultHasStatus(0, 'Draft');
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

        it('opens search modal with Ctrl/Cmd+K', async function () {
            await visit('/analytics');
            assertSearchModalClosed();
            await openSearch();
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

            assertSearchGroups();
            assertSearchResults(['First user', 'First tag', 'First post', 'First page']);
            assertResultSelected(0);
        });

        it('shows "No results found" when search has no matches', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('xyz123nonexistent');

            assertNoResults();
        });

        it('handles slow search requests gracefully', async function () {
            this.server.get('/posts/', getPosts, {timing: 200});

            await visit('/analytics');
            await openSearch();
            await searchFor('first');

            assertSearchResults(['First user', 'First tag', 'First post', 'First page']);
        });

        it('navigates search results with arrow keys', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('first'); // Get multiple results

            const searchOptions = getSearchOptions();
            expect(searchOptions).to.have.length(4);

            // First item should be selected by default
            assertSelectedText('First user');

            // Navigate down should move to second item
            await navigateDown();
            assertSelectedText('First tag');

            // Navigate up should move back to first item
            await navigateUp();
            assertSelectedText('First user');
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

        it('shows status labels for draft and scheduled posts', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('post');

            const searchOptions = getSearchOptions();

            // Posts are sorted by status priority: scheduled > draft > published > sent
            // We created: 1 scheduled, 1 draft, 2 published posts
            // So the order should be: Scheduled post, Draft post, First post, Published post

            // Verify scheduled post appears first with Scheduled label
            expect(getTitleText(searchOptions[0])).to.equal('Scheduled post');
            assertResultHasStatus(0, 'Scheduled');

            // Verify draft post appears second with Draft label
            expect(getTitleText(searchOptions[1])).to.equal('First post');
            assertResultHasStatus(1, 'Draft');
            expect(getTitleText(searchOptions[2])).to.equal('Draft post');
            assertResultHasStatus(2, 'Draft');

            // Verify published posts have no status label
            expect(getTitleText(searchOptions[3])).to.equal('Second post');
            assertResultHasStatus(3, null);

            expect(getTitleText(searchOptions[4])).to.equal('Published post');
            assertResultHasStatus(4, null);
        });

        it('shows status label for draft page', async function () {
            await visit('/analytics');
            await openSearch();
            await searchFor('First page');

            const searchOptions = getSearchOptions();

            // First page should be a draft
            const pageOption = searchOptions[0];
            expect(getTitleText(pageOption)).to.equal('First page');
            assertResultHasStatus(0, 'Draft');
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
