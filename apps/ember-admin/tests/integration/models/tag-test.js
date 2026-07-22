import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupTest} from 'ember-mocha';

describe('Integration: Model: tag', function () {
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

        it('expires on create', async function () {
            const tagModel = await store.createRecord('tag');
            tagModel.name = 'Test tag';
            await tagModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('expires on delete', async function () {
            const serverTag = this.server.create('tag');

            const tagModel = await store.find('tag', serverTag.id);
            await tagModel.destroyRecord();

            expect(search.isContentStale, 'stale flag after delete').to.be.true;
        });

        it('expires when name changed', async function () {
            const serverTag = this.server.create('tag');

            const tagModel = await store.find('tag', serverTag.id);
            tagModel.name = 'New name';
            await tagModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('expires when url changed', async function () {
            const serverTag = this.server.create('tag');

            const tagModel = await store.find('tag', serverTag.id);
            tagModel.slug = 'new-slug';
            await tagModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('does not expire on non-name change', async function () {
            const serverTag = this.server.create('tag');

            const tagModel = await store.find('tag', serverTag.id);
            tagModel.description = 'New description';
            await tagModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.false;
        });
    });
});
