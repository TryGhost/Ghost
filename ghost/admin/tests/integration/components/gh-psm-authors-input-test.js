import hbs from 'htmlbars-inline-precompile';
import mockUsers from '../../../mirage/config/users';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {findAll, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

const TEMPLATE = hbs`<GhPsmAuthorsInput
    @selectedAuthors={{this.selectedAuthors}}
    @updateAuthors={{this.updateAuthors}}
    @triggerId="author-list"
/>`;

// the author dropdown queries `GET /users/?...` - filter to just those browse
// requests (ignores /users/me, /users/:id, etc.)
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

    it('shows selected authors while loading authors in the background', async function () {
        server.create('user', {name: 'Adam Author'});
        server.create('user', {name: 'Betty Blogger'});

        const users = await this.store.query('user', {limit: 100});
        const adam = users.toArray().find(user => user.name === 'Adam Author');
        this.set('selectedAuthors', [adam]);

        const requestCount = server.pretender.handledRequests.length;

        await render(TEMPLATE);

        const selected = findAll('[data-test-selected-token]');
        expect(selected.length, 'selected tokens').to.equal(1);
        expect(selected[0]).to.contain.text('Adam Author');

        expect(server.pretender.handledRequests.length, 'request count').to.equal(requestCount + 1);
    });

    it('loads all authors page-by-page in the background', async function () {
        server.createList('user', 150);

        await render(TEMPLATE);

        const requests = browseRequests(server);
        expect(requests.length, 'background page requests').to.equal(2);
        expect(requests[0].queryParams.include).to.contain('count.posts');
        expect(requests[0].queryParams.order).to.equal('count.posts desc, name asc');
        expect(requests[0].queryParams.limit).to.equal('100');
        expect(requests[0].queryParams.page).to.equal('1');
        expect(requests[1].queryParams.page).to.equal('2');
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

        const requestCount = server.pretender.handledRequests.length;
        await typeInSearch('Author 1');
        await settled();

        // no extra request - filtering happens client-side
        expect(server.pretender.handledRequests.length).to.equal(requestCount);
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

        const requestCount = server.pretender.handledRequests.length;
        await typeInSearch('zzz@unique');
        await settled();

        const optionText = findAll('.ember-power-select-option').map(option => option.textContent.trim());
        expect(optionText).to.include('Betty Blogger');
        expect(optionText).to.not.include('Adam Author');
        // small site => filtering stays client-side, no API request
        expect(server.pretender.handledRequests.length).to.equal(requestCount);
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
