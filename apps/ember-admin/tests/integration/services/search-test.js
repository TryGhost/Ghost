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

        describe('Ghost(Pro) results', function () {
            beforeEach(function () {
                const config = this.owner.lookup('config:main');
                config.hostSettings = {billing: {enabled: true}};

                const session = this.owner.lookup('service:session');
                session.user = {isOwnerOnly: true};
            });

            it('includes Ghost(Pro) results before content results', async function () {
                this.server.create('post', {title: 'Backup post', slug: 'backup-post'});

                const results = await search.searchTask.perform('backup');

                expect(results.map(group => group.groupName)).to.deep.equal(['Ghost(Pro)', 'Posts']);

                const titles = results[0].options.map(option => option.title);
                expect(titles).to.include('Request backup');
                expect(results[0].options[0].path).to.equal('/pro/backups');
            });

            it('lists Ghost(Pro) results in a fixed order', async function () {
                const results = await search.searchTask.perform('pro');

                expect(results[0].groupName).to.equal('Ghost(Pro)');
                expect(results[0].options.map(option => option.title)).to.deep.equal([
                    'Start subscription',
                    'Change plan',
                    'Cancel subscription',
                    'View invoices',
                    'Update payment method',
                    'Set up a custom domain',
                    'Change ghost.io domain',
                    'Buy a new domain',
                    'Request backup',
                    'Contact support'
                ]);
            });

            it('matches Ghost(Pro) results on keywords', async function () {
                const results = await search.searchTask.perform('dns');

                expect(results).to.have.length(1);
                expect(results[0].groupName).to.equal('Ghost(Pro)');
                expect(results[0].options.map(option => option.title)).to.include('Set up a custom domain');

                const invoiceResults = await search.searchTask.perform('invoice');
                expect(invoiceResults[0].options.map(option => option.title)).to.include('View invoices');

                const paymentResults = await search.searchTask.perform('payment method');
                expect(paymentResults[0].options.map(option => option.title)).to.include('Update payment method');

                const priceResults = await search.searchTask.perform('price');
                expect(priceResults[0].options.map(option => option.title)).to.include('Change plan');

                const buyDomainResults = await search.searchTask.perform('purchase');
                expect(buyDomainResults[0].options.map(option => option.title)).to.include('Buy a new domain');
            });

            it('does not request Ghost(Pro) results from the API', async function () {
                await search.searchTask.perform('backup');

                expect(searchIndexRequests(this.server), 'search index requests').to.have.length(4);
            });

            it('excludes Ghost(Pro) results when billing is not enabled', async function () {
                this.owner.lookup('config:main').hostSettings = {};

                const results = await search.searchTask.perform('backup');

                expect(results.map(group => group.groupName)).to.not.include('Ghost(Pro)');
            });

            it('excludes Ghost(Pro) results for non-owner users', async function () {
                this.owner.lookup('service:session').user = {isOwnerOnly: false};

                const results = await search.searchTask.perform('backup');

                expect(results.map(group => group.groupName)).to.not.include('Ghost(Pro)');
            });

            it('includes Ghost(Pro) results for non-owner users in a force upgrade state', async function () {
                this.owner.lookup('config:main').hostSettings = {billing: {enabled: true}, forceUpgrade: true};
                this.owner.lookup('service:session').user = {isOwnerOnly: false};

                const results = await search.searchTask.perform('backup');

                expect(results.map(group => group.groupName)).to.include('Ghost(Pro)');
            });
        });
    });
});
