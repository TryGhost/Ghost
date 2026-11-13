import assert from 'node:assert/strict';
import { ACTION_KINDS } from '../../../../../core/server/lib/action-log/kinds';

const schema = require('../../../../../core/server/data/schema/schema');
const models = require('../../../../../core/server/models');

describe('Unit: lib/action-log/kinds', function () {
  it('points every kind at a table in the schema', function () {
    for (const [kind, { table }] of Object.entries(ACTION_KINDS)) {
      assert.ok(schema[table], `${kind} points at ${table}, which is not a table`);
    }
  });

  it('gives the Action model a read model for every kind', function () {
    const action = models.Action.forge();
    const candidates: Array<[{ prototype: { tableName: string } }, string]> =
      action.resourceCandidates();

    for (const [kind, { table }] of Object.entries(ACTION_KINDS)) {
      const candidate = candidates.find(([, type]) => type === kind);
      assert.ok(candidate, `no read model for ${kind}`);
      assert.equal(candidate[0].prototype.tableName, table);
    }
  });
});
