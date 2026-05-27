import assert from 'node:assert/strict';
import sinon from 'sinon';

const {NotificationRepository} = require('../../../../../core/server/services/notifications/repository');

function build(stored: unknown) {
    const breadEdit = sinon.stub().resolves();
    const modelEdit = sinon.stub().resolves();
    const repository = new NotificationRepository({
        settingsCache: {get: () => stored},
        getSettingsBREADService: () => ({edit: breadEdit}),
        settingsModel: {edit: modelEdit}
    });
    return {repository, breadEdit, modelEdit};
}

describe('NotificationRepository', function () {
    describe('getAll', function () {
        it('returns the stored notifications with addedAt as a Date', function () {
            const {repository} = build([{id: 'a', addedAt: '2021-03-17T01:41:20.906Z'}]);

            const all = repository.getAll();

            assert.equal(all.length, 1);
            assert.equal(all[0].id, 'a');
            assert.ok(all[0].addedAt instanceof Date);
        });

        it('resets corrupt (non-array) storage and returns an empty set', function () {
            const {repository, modelEdit} = build({message: 'this should be an array'});

            const all = repository.getAll();

            assert.deepEqual(all, []);
            sinon.assert.calledOnce(modelEdit);
            assert.deepEqual(modelEdit.args[0][0], [{key: 'notifications', value: '[]'}]);
        });

        it('does not reset when the stored data is a valid array', function () {
            const {repository, modelEdit} = build([{id: 'a', addedAt: '2021-03-17T01:41:20.906Z'}]);

            repository.getAll();

            sinon.assert.notCalled(modelEdit);
        });
    });

    describe('getById', function () {
        it('returns the matching notification', function () {
            const {repository} = build([{id: 'a'}, {id: 'b'}]);
            assert.equal(repository.getById('b').id, 'b');
        });

        it('returns null when there is no match', function () {
            const {repository} = build([{id: 'a'}]);
            assert.equal(repository.getById('missing'), null);
        });
    });

    describe('add', function () {
        it('appends the notification and persists the full set', async function () {
            const {repository, breadEdit} = build([{id: 'a', addedAt: '2021-03-17T01:41:20.906Z'}]);

            await repository.add({id: 'b'});

            sinon.assert.calledOnce(breadEdit);
            const persisted = breadEdit.args[0][0][0].value;
            assert.deepEqual(persisted.map((n: {id: string}) => n.id), ['a', 'b']);
        });
    });

    describe('edit', function () {
        it('replaces the matching notification by id', async function () {
            const {repository, breadEdit} = build([
                {id: 'a', seen: false, addedAt: '2021-03-17T01:41:20.906Z'},
                {id: 'b', seen: false, addedAt: '2021-03-17T01:41:20.906Z'}
            ]);

            await repository.edit({id: 'a', seen: true});

            const persisted = breadEdit.args[0][0][0].value;
            assert.equal(persisted.find((n: {id: string}) => n.id === 'a').seen, true);
            assert.equal(persisted.find((n: {id: string}) => n.id === 'b').seen, false);
        });
    });

    describe('deleteById', function () {
        it('removes the matching notification and persists the rest', async function () {
            const {repository, breadEdit} = build([
                {id: 'a', addedAt: '2021-03-17T01:41:20.906Z'},
                {id: 'b', addedAt: '2021-03-17T01:41:20.906Z'}
            ]);

            await repository.deleteById('a');

            const persisted = breadEdit.args[0][0][0].value;
            assert.deepEqual(persisted.map((n: {id: string}) => n.id), ['b']);
        });
    });

    describe('deleteAll', function () {
        it('wipes storage to an empty array via the settings model', async function () {
            const {repository, modelEdit} = build([{id: 'a'}]);

            await repository.deleteAll();

            sinon.assert.calledOnce(modelEdit);
            assert.deepEqual(modelEdit.args[0][0], [{key: 'notifications', value: '[]'}]);
        });
    });
});
