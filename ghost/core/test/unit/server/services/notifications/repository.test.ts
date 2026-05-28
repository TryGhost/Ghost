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

    describe('replaceAll', function () {
        it('persists the supplied collection through the settings BREAD service', async function () {
            const {repository, breadEdit} = build([{id: 'a', addedAt: '2021-03-17T01:41:20.906Z'}]);

            await repository.replaceAll([{id: 'b'}, {id: 'c'}]);

            sinon.assert.calledOnce(breadEdit);
            assert.deepEqual(breadEdit.args[0][0], [{
                key: 'notifications',
                value: [{id: 'b'}, {id: 'c'}]
            }]);
            assert.deepEqual(breadEdit.args[0][1], {context: {internal: true}});
        });

        it('can persist an empty collection', async function () {
            const {repository, breadEdit} = build([{id: 'a'}]);

            await repository.replaceAll([]);

            assert.deepEqual(breadEdit.args[0][0][0].value, []);
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
