import {afterAll, afterEach, beforeAll, describe, it} from 'vitest';
import assert from 'node:assert/strict';
import {actionLogger} from '../../../core/server/services/actions';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

describe('actionLogger (integration)', function () {
    const log = actionLogger(models.Action);
    const rows = () => models.Base.knex('actions').orderBy('created_at');
    const actionNameOf = (row: {context: unknown}): string =>
        (typeof row.context === 'string' ? JSON.parse(row.context) : row.context).action_name;

    afterAll(testUtils.teardownDb);

    beforeAll(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('users:roles')();
    });

    afterEach(async function () {
        await models.Base.knex('actions').del();
    });

    it('writes an action row from a domain entry', async function () {
        await log({event: 'edited', resourceType: 'gift_link', resourceId: 'post-1', actionName: 'reset', actor: {id: 'u1', type: 'user'}});

        const [row] = await rows();
        assert.ok(row, 'an action row should be written');
        assert.equal(row.event, 'edited');
        assert.equal(row.resource_type, 'gift_link');
        assert.equal(row.resource_id, 'post-1');
        assert.equal(row.actor_type, 'user');
        assert.equal(row.actor_id, 'u1');
        assert.equal(actionNameOf(row), 'reset');
    });

    it('omits action_name when the entry has none', async function () {
        await log({event: 'deleted', resourceType: 'gift_link', resourceId: null, actor: {id: 'u', type: 'user'}});

        const [row] = await rows();
        assert.equal(row.event, 'deleted');
        assert.ok(!row.context, 'no context stored when actionName is omitted');
    });

    it('is best-effort: a failing recorder does not throw', async function () {
        const broken = actionLogger({
            add: async () => {
                throw new Error('boom');
            }
        });

        await assert.doesNotReject(
            () => broken({event: 'added', resourceType: 'x', resourceId: null, actor: {id: 'u', type: 'user'}})
        );
    });
});
