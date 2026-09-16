import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupTest} from 'ember-mocha';

describe('Integration: Model: user', function () {
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

        it('expires on delete', async function () {
            const serverUser = this.server.create('user');

            const userModel = await store.find('user', serverUser.id);
            await userModel.destroyRecord();

            expect(search.isContentStale, 'stale flag after delete').to.be.true;
        });

        it('expires when name changed', async function () {
            const serverUser = this.server.create('user');

            const userModel = await store.find('user', serverUser.id);
            userModel.name = 'New name';
            await userModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('expires when url changed', async function () {
            const serverUser = this.server.create('user');

            const userModel = await store.find('user', serverUser.id);
            userModel.slug = 'new-slug';
            await userModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.true;
        });

        it('does not expire on non-name change', async function () {
            const serverUser = this.server.create('user');

            const userModel = await store.find('user', serverUser.id);
            userModel.description = 'New description';
            await userModel.save();

            expect(search.isContentStale, 'stale flag after save').to.be.false;
        });
    });
});
