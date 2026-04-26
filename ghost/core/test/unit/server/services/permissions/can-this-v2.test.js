const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');
const actionsMap = require('../../../../../core/server/services/permissions/actions-map-cache');
const canThisV2 = require('../../../../../core/server/services/permissions/can-this-v2');

// Seed actionsMap directly without spinning up Bookshelf's Permissions
// collection — this lets the test exercise non-default actions like 'publish'.
function seedActionsMap(entries) {
    const stubModels = entries.map(([actionType, objectType]) => ({
        get(field) {
            if (field === 'action_type') {
                return actionType;
            }
            if (field === 'object_type') {
                return objectType;
            }
        }
    }));
    actionsMap.init({models: stubModels});
}

describe('Permissions: canThisV2 chain', function () {
    before(function () {
        models.init();
        seedActionsMap([
            ['browse', 'post'], ['edit', 'post'], ['add', 'post'],
            ['destroy', 'post'], ['publish', 'post'],
            ['edit', 'user'], ['destroy', 'user']
        ]);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('exposes action.objectType handlers built from the actions map', function () {
        const result = canThisV2({user: 1, userRoleName: 'Editor'});
        assert.equal(typeof result.edit, 'object');
        assert.equal(typeof result.edit.post, 'function');
        assert.equal(typeof result.browse, 'object');
    });

    it('Editor can edit:post (resolves)', async function () {
        sinon.stub(models.Post, 'permissible').resolves();
        await canThisV2({user: 1, userRoleName: 'Editor'}).edit.post('id-1', {});
    });

    it('Contributor cannot publish:post (rejects with NoPermissionError)', async function () {
        // No model.permissible override: base check denies.
        sinon.stub(models.Post, 'permissible').value(undefined);
        await assert.rejects(
            () => canThisV2({user: 1, userRoleName: 'Contributor'}).publish.post('id-1', {}),
            /You do not have permission/i
        );
    });

    it('internal context resolves immediately without invoking model.permissible', async function () {
        const stub = sinon.stub(models.Post, 'permissible').rejects(new Error('should not be called'));
        await canThisV2({internal: true}).edit.post('id-1', {});
        assert.equal(stub.called, false);
    });

    // Owner short-circuit and staff-API-key precedence are covered exhaustively
    // in compute-base-permission.test.js (the layer where they live). Here we
    // just verify the chain plumbs them through end-to-end.
    it('Owner can perform any action (no model.permissible needed)', async function () {
        sinon.stub(models.Post, 'permissible').value(undefined);
        await canThisV2({user: 1, userRoleName: 'Owner'}).destroy.post('id-1', {});
    });

    it('api_key only with role that lacks the action -> denies', async function () {
        sinon.stub(models.Post, 'permissible').value(undefined);
        await assert.rejects(
            () => canThisV2({
                api_key: {id: 'k1', type: 'admin'}, apiKeyRoleName: 'DB Backup Integration'
            }).edit.post('id-1', {}),
            /You do not have permission/i
        );
    });
});
