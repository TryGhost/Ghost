import hbs from 'htmlbars-inline-precompile';
import mockUsers from '../../../mirage/config/users';
import {click, find, findAll, render, settled, waitUntil} from '@ember/test-helpers';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

const TEMPLATE = hbs`<GhPsmAuthorsInput
    @selectedAuthors={{this.selectedAuthors}}
    @updateAuthors={{this.updateAuthors}}
    @triggerId="author-list"
/>`;

function browseRequests(server) {
    return server.pretender.handledRequests.filter(request => request.url.includes('users/?'));
}

describe('Integration: Component: gh-psm-authors-input', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();
        mockUsers(server);

        this.set('store', this.owner.lookup('service:store'));
        this.set('selectedAuthors', []);
        this.set('updateAuthors', () => {});
    });

    afterEach(function () {
        server.shutdown();
    });

    it('shows selected authors before loading author options', async function () {
        server.create('user', {name: 'Adam Author'});

        const users = await this.store.query('user', {limit: 100});
        const adam = users.toArray().find(user => user.name === 'Adam Author');
        this.set('selectedAuthors', [adam]);

        const requestCount = browseRequests(server).length;

        await render(TEMPLATE);

        const selected = findAll('[data-test-selected-token]');
        expect(selected.length, 'selected tokens').to.equal(1);
        expect(selected[0]).to.contain.text('Adam Author');
        expect(browseRequests(server).length, 'author browse requests').to.equal(requestCount);
    });

    it('loads authors page-by-page as the dropdown is used', async function () {
        server.createList('user', 150, {name: i => `Author ${String(i).padStart(3, '0')}`});

        await render(TEMPLATE);
        expect(browseRequests(server).length, 'requests before open').to.equal(0);

        await clickTrigger();
        await waitUntil(() => browseRequests(server).length === 1);

        const firstRequest = browseRequests(server)[0];
        expect(firstRequest.queryParams.include).to.contain('count.posts');
        expect(firstRequest.queryParams.order).to.equal('count.posts desc, name asc');
        expect(firstRequest.queryParams.limit).to.equal('100');
        expect(firstRequest.queryParams.page).to.equal('1');

        const optionsContent = find('.ember-power-select-options');
        optionsContent.scrollTo({top: optionsContent.scrollHeight});
        await waitUntil(() => browseRequests(server).some(request => request.queryParams.page === '2'));
    });

    it('excludes already-selected authors from the options', async function () {
        server.create('user', {name: 'Adam Author'});
        server.create('user', {name: 'Betty Blogger'});

        const users = await this.store.query('user', {limit: 100});
        const adam = users.toArray().find(user => user.name === 'Adam Author');
        this.set('selectedAuthors', [adam]);

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.not.include('Adam Author');
        expect(optionText).to.include('Betty Blogger');
    });

    it('uses client-side search when all authors fit on the first page', async function () {
        server.createList('user', 3, {name: i => `Author ${i}`});

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        const requestCount = browseRequests(server).length;
        await typeInSearch('Author 1');
        await settled();

        expect(browseRequests(server).length).to.equal(requestCount);
    });

    it('uses client-side search after all author pages have been loaded', async function () {
        server.createList('user', 309, {name: i => `Author ${String(i).padStart(3, '0')}`});
        server.create('user', {name: 'Search Before Loading', email: 'search-before-loading@example.com'});

        await render(TEMPLATE);
        await clickTrigger();
        await waitUntil(() => browseRequests(server).length === 1);

        await typeInSearch('search-before-loading');
        await waitUntil(() => browseRequests(server).some(request => request.queryParams.filter?.includes('search-before-loading')));
        await typeInSearch('');
        await settled();

        const optionsContent = find('.ember-power-select-options');
        for (let page = 2; page <= 4; page += 1) {
            optionsContent.scrollTo({top: optionsContent.scrollHeight});
            await waitUntil(() => browseRequests(server).some(request => request.queryParams.page === String(page)));
            await settled();
        }

        optionsContent.scrollTo({top: optionsContent.scrollHeight});
        await settled();

        const requestCount = browseRequests(server).length;
        await typeInSearch('Author 221');
        await settled();

        expect(browseRequests(server).length).to.equal(requestCount);
    });

    it('finds an author by slug or email on a large site', async function () {
        server.createList('user', 150, {name: i => `Author ${String(i).padStart(3, '0')}`});
        server.create('user', {name: 'Distinctive Person', slug: 'dperson', email: 'unique@example.com'});

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        await typeInSearch('unique@example');
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.include('Distinctive Person');
    });

    it('matches authors by slug or email in the client-side fallback', async function () {
        server.create('user', {name: 'Adam Author', slug: 'adam', email: 'adam@example.com'});
        server.create('user', {name: 'Betty Blogger', slug: 'betty', email: 'zzz@unique.com'});

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        const requestCount = browseRequests(server).length;
        await typeInSearch('zzz@unique');
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.include('Betty Blogger');
        expect(optionText).to.not.include('Adam Author');
        expect(browseRequests(server).length).to.equal(requestCount);
    });

    it('matches authors without requiring matching diacritics in the client-side fallback', async function () {
        server.create('user', {name: 'José García', slug: 'jose-garcia', email: 'jose@example.com'});

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        const requestCount = browseRequests(server).length;
        await typeInSearch('Jose Garcia');
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.include('José García');
        expect(browseRequests(server).length).to.equal(requestCount);
    });

    it('keeps authors selected from search available after they are deselected', async function () {
        server.createList('user', 150, {name: i => `Author ${String(i).padStart(3, '0')}`});
        server.create('user', {name: 'Remote Match', slug: 'remote-match', email: 'remote@example.com'});

        this.set('updateAuthors', (authors) => {
            this.set('selectedAuthors', authors);
        });

        await render(TEMPLATE);
        await clickTrigger();
        await settled();

        await typeInSearch('remote@example');
        await settled();
        await selectChoose('.ember-power-select-trigger', 'Remote Match');
        await settled();

        let removeBtns = findAll('.ember-power-select-multiple-remove-btn');
        await click(removeBtns[0]);

        await clickTrigger();
        await typeInSearch('Remote Match');
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.include('Remote Match');
    });

    it('calls updateAuthors when an author is selected', async function () {
        server.create('user', {name: 'Adam Author'});
        server.create('user', {name: 'Betty Blogger'});

        let updated = null;
        this.set('updateAuthors', (authors) => {
            updated = authors;
        });

        await render(TEMPLATE);
        await selectChoose('.ember-power-select-trigger', 'Betty Blogger');

        expect(updated, 'updateAuthors called').to.not.be.null;
        expect(updated.map(author => author.name)).to.include('Betty Blogger');
    });
});
