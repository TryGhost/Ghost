import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

function buildLabel({id, slug, name}) {
    return {
        id,
        slug,
        name,
        get(key) {
            return this[key];
        }
    };
}

function buildCollection(records, {page, pages}) {
    records.meta = {
        pagination: {
            page,
            pages
        }
    };
    return records;
}

describe('Integration: Service: labels-manager', function () {
    setupTest();

    afterEach(function () {
        sinon.restore();
    });

    it('loads labels page-by-page and deduplicates by slug', async function () {
        const store = this.owner.lookup('service:store');
        const labelsManager = this.owner.lookup('service:labels-manager');

        const pageOne = buildCollection([
            buildLabel({id: '1', slug: 'alpha', name: 'Alpha'}),
            buildLabel({id: '2', slug: 'beta', name: 'Beta'})
        ], {page: 1, pages: 2});

        const pageTwo = buildCollection([
            buildLabel({id: '2', slug: 'beta', name: 'Beta'}),
            buildLabel({id: '3', slug: 'gamma', name: 'Gamma'})
        ], {page: 2, pages: 2});

        const queryStub = sinon.stub(store, 'query');
        queryStub.onCall(0).resolves(pageOne);
        queryStub.onCall(1).resolves(pageTwo);

        await labelsManager.loadMoreTask.perform();
        await labelsManager.loadMoreTask.perform();
        await labelsManager.loadMoreTask.perform();

        expect(queryStub.callCount).to.equal(2);
        expect(queryStub.firstCall.args[1]).to.deep.equal({limit: 100, page: 1, order: 'name asc'});
        expect(queryStub.secondCall.args[1]).to.deep.equal({limit: 100, page: 2, order: 'name asc'});

        expect(labelsManager._labels.map(label => label.slug)).to.deep.equal(['alpha', 'beta', 'gamma']);
        expect(labelsManager.hasLoaded).to.be.true;
        expect(labelsManager.hasLoadedAll).to.be.true;
    });

    it('escapes single quotes in search filters', async function () {
        const store = this.owner.lookup('service:store');
        const labelsManager = this.owner.lookup('service:labels-manager');

        const results = buildCollection([], {page: 1, pages: 1});
        const queryStub = sinon.stub(store, 'query').resolves(results);

        await labelsManager.searchLabelsTask.perform('Bob\'s');

        expect(queryStub.calledOnce).to.be.true;
        expect(queryStub.firstCall.args[0]).to.equal('label');
        expect(queryStub.firstCall.args[1]).to.deep.equal({
            filter: 'name:~\'Bob\\\'s\'',
            limit: 100,
            page: 1,
            order: 'name asc'
        });
    });

    it('registers search results so they are findable by slug', async function () {
        const store = this.owner.lookup('service:store');
        const labelsManager = this.owner.lookup('service:labels-manager');
        const searchedLabel = buildLabel({id: '99', slug: 'searched', name: 'Searched'});

        const results = buildCollection([searchedLabel], {page: 1, pages: 1});
        sinon.stub(store, 'query').resolves(results);

        expect(labelsManager.findBySlug('searched')).to.be.undefined;

        await labelsManager.searchLabelsTask.perform('Searched');

        expect(labelsManager.findBySlug('searched')).to.equal(searchedLabel);
        expect(labelsManager._labels.map(l => l.slug)).to.include('searched');
    });

    it('falls back to store labels when findBySlug cache is empty', function () {
        const store = this.owner.lookup('service:store');
        const labelsManager = this.owner.lookup('service:labels-manager');
        const fallbackLabel = buildLabel({id: '10', slug: 'fallback', name: 'Fallback'});

        sinon.stub(store, 'peekAll').returns([fallbackLabel]);

        expect(labelsManager.findBySlug('fallback')).to.equal(fallbackLabel);
    });

    it('supports cache mutation helpers and reset', function () {
        const labelsManager = this.owner.lookup('service:labels-manager');
        const alpha = buildLabel({id: '1', slug: 'alpha', name: 'Alpha'});
        const beta = buildLabel({id: '2', slug: 'beta', name: 'Beta'});

        labelsManager.addLabel(alpha);
        labelsManager.addLabel(alpha);
        labelsManager.addLabel(beta);

        expect(labelsManager._labels.map(label => label.slug)).to.deep.equal(['alpha', 'beta']);

        labelsManager.removeLabel(alpha);
        expect(labelsManager._labels.map(label => label.slug)).to.deep.equal(['beta']);

        labelsManager.reset();
        expect(labelsManager._labels.length).to.equal(0);
        expect(labelsManager.hasLoaded).to.be.false;
    });
});
