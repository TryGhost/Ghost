import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupTest} from 'ember-mocha';

describe('Integration: Model: post', function () {
    const hooks = setupTest();
    setupMirage(hooks);

    let store;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
    });

    describe('search expiry', function () {
        let search;

        beforeEach(function () {
            search = this.owner.lookup('service:search');
            search.isContentStale = false;
        });

        it('expires on published save', async function () {
            const serverPost = this.server.create('post', {status: 'published'});

            const postModel = await store.find('post', serverPost.id);
            await postModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('expires on published delete', async function () {
            const serverPost = this.server.create('post', {status: 'published'});

            const postModel = await store.find('post', serverPost.id);
            await postModel.destroyRecord();

            expect(search.isContentStale, 'stale flag after delete').to.be.true;
        });

        it('expires when publishing', async function () {
            const serverPost = this.server.create('post', {status: 'draft'});

            const postModel = await store.find('post', serverPost.id);
            postModel.status = 'published';
            await postModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('expires when unpublishing', async function () {
            const serverPost = this.server.create('post', {status: 'published'});

            const postModel = await store.find('post', serverPost.id);
            postModel.status = 'draft';
            await postModel.save();

            expect(search.isContentStale, 'stale flag after unpublish').to.be.true;
        });

        it('does not expire on draft save', async function () {
            const serverPost = this.server.create('post', {status: 'draft'});

            const postModel = await store.find('post', serverPost.id);
            await postModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.false;
        });

        it('does not expire on draft delete', async function () {
            const serverPost = this.server.create('post', {status: 'draft'});

            const postModel = await store.find('post', serverPost.id);
            await postModel.destroyRecord();

            expect(search.isContentStale, 'stale flag after save').to.be.false;
        });
    });
});
