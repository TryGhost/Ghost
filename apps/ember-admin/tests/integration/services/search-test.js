import sinon from 'sinon';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupTest} from 'ember-mocha';

// we have two search providers
// - "flex" which uses the flexsearch engine but is limited to english only
// - "basic" which uses exact string matches in a less performant way but is language agnostic
const suites = [{
    name: 'Integration: Service: Search (flex)',
    beforeEach() {
        // noop - default locale is 'en'
    },
    confirmProvider() {
        const searchService = this.owner.lookup('service:search');
        expect(searchService.provider.constructor.name, 'provider name').to.equal('SearchProviderFlexService');
    }
}, {
    name: 'Integration: Service: Search (basic)',
    beforeEach() {
        this.server.db.settings.update({key: 'locale'}, {value: 'de'});
    },
    confirmProvider() {
        const settingsService = this.owner.lookup('service:settings');
        expect(settingsService.locale, 'settings.locale').to.equal('de');
        const searchService = this.owner.lookup('service:search');
        expect(searchService.provider.constructor.name, 'provider name').to.equal('SearchProviderBasicService');
    }
}];

function searchIndexRequests(server) {
    return server.pretender.handledRequests.filter(request => request.url.includes('/search-index/'));
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

suites.forEach((suite) => {
    describe(suite.name, function () {
        const hooks = setupTest();
        setupMirage(hooks);

        let search;
        // eslint-disable-next-line no-unused-vars
        let firstUser, firstPost, secondPost, firstPage, firstTag;

        beforeEach(async function () {
            this.server.loadFixtures();
            await authenticateSession();

            suite.beforeEach.bind(this)();

            const settings = this.owner.lookup('service:settings');
            await settings.fetch();

            search = this.owner.lookup('service:search');

            // populate store with data we'll be searching
            firstPost = this.server.create('post', {title: 'First post', slug: 'first-post', visibility: 'members', publishedAt: '2024-05-08T16:21:07.000Z'});
            secondPost = this.server.create('post', {title: 'Second post', slug: 'second-post'});
            firstPage = this.server.create('page', {title: 'First page', slug: 'first-page'});
            firstTag = this.server.create('tag', {name: 'First tag', slug: 'first-tag'});
            firstUser = this.server.create('user', {name: 'First user', slug: 'first-user'});
        });

        afterEach(function () {
            sinon.restore();
        });

        it('is using correct provider', async function () {
            suite.confirmProvider.bind(this)();
        });

        it('returns urls for search results', async function () {
            const results = await search.searchTask.perform('first');

            expect(results[0].options[0].url).to.equal('http://localhost:4200/user/first-user/');
            expect(results[1].options[0].url).to.equal('http://localhost:4200/tag/first-tag/');
            expect(results[2].options[0].url).to.equal('http://localhost:4200/p/post-0/');
            expect(results[3].options[0].url).to.equal('http://localhost:4200/p/page-0/');
        });

        it('returns additional post-related fields', async function () {
            const results = await search.searchTask.perform('post');

            expect(results[0].options[0].visibility).to.equal('members');
            expect(results[0].options[0].publishedAt).to.equal('2024-05-08T16:21:07.000Z');
        });

        it('does not refresh cached content for subsequent searches', async function () {
            await search.searchTask.perform('first');

            expect(searchIndexRequests(this.server), 'initial search index requests').to.have.length(4);

            await search.searchTask.perform('post');

            expect(searchIndexRequests(this.server), 'later search index requests').to.have.length(4);
        });

        it('keeps the content cache fresh after a restarted search waits for an in-flight refresh', async function () {
            this.server.timing = 500;

            search.searchTask.perform('fir');
            await search.searchTask.perform('first');

            expect(searchIndexRequests(this.server), 'initial search index requests').to.have.length(4);

            await search.searchTask.perform('post');

            expect(searchIndexRequests(this.server), 'later search index requests').to.have.length(4);
        });

        it('keeps one provider refresh alive across restarted searches', async function () {
            let resolveRefresh;
            const provider = search.provider;
            const refreshPromise = new Promise((resolve) => {
                resolveRefresh = resolve;
            });

            sinon.stub(provider.refreshContentTask, 'perform').returns(refreshPromise);
            sinon.stub(provider.searchTask, 'perform').returns([]);

            search.searchTask.perform('t');
            await wait(250);

            search.searchTask.perform('te');
            await wait(250);

            const finalSearch = search.searchTask.perform('tes');
            await wait(250);

            expect(provider.refreshContentTask.perform, 'provider refresh starts').to.have.been.calledOnce;

            resolveRefresh();
            await finalSearch;

            expect(search.isContentStale, 'stale flag after shared refresh').to.be.false;

            await search.searchTask.perform('post');

            expect(provider.refreshContentTask.perform, 'provider refresh starts after cached search').to.have.been.calledOnce;
        });
    });
});
