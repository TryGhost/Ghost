import assert from 'node:assert/strict';
import sinon from 'sinon';
import knex, { type Knex } from 'knex';

const ghostBookshelf = require('../../../../core/server/models/base');
const { Label } = require('../../../../core/server/models/label');

describe('Unit: models/label', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('findCandidatesByName', function () {
    let db: Knex | undefined;

    afterEach(async function () {
      await db?.destroy();
      db = undefined;
    });

    function compileLookup(client: string) {
      db = knex({ client, useNullAsDefault: true });
      sinon.replace(ghostBookshelf, 'knex', db);
      return Label.findCandidatesByName(['VIP', 'Brand New']).toSQL();
    }

    it('narrows the lookup to the named labels on MySQL', function () {
      const { sql, bindings } = compileLookup('mysql2');

      assert.equal(sql, 'select `id`, `name` from `labels` where `name` in (?, ?)');
      assert.deepEqual(bindings, ['VIP', 'Brand New']);
    });

    it('reads every label on SQLite, where names compare case-sensitively', function () {
      const { sql, bindings } = compileLookup('better-sqlite3');

      assert.equal(sql, 'select `id`, `name` from `labels`');
      assert.deepEqual(bindings, []);
    });

    it('runs inside the given transaction', function () {
      const builder = {
        select: sinon.stub().returnsThis(),
        whereIn: sinon.stub().returnsThis(),
        transacting: sinon.stub().returnsThis(),
      };
      // DatabaseInfo reads the driver name from `knex.client.config.client`
      const fakeKnex = Object.assign(sinon.stub().returns(builder), {
        client: { config: { client: 'mysql2' } },
      });
      sinon.replace(ghostBookshelf, 'knex', fakeKnex);
      const transacting = {};

      Label.findCandidatesByName(['VIP'], { transacting });

      sinon.assert.calledOnceWithExactly(builder.transacting, transacting);
    });
  });
});
