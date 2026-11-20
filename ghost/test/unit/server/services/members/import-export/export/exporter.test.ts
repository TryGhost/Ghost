import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { Knex } from 'knex';
import MembersCSVExporter, {
  type ExportOptions,
} from '../../../../../../../core/server/services/members/import-export/export/exporter';
import { createTracer } from '../../../../../../../core/server/lib/tracing/create-tracer';
import { importExportTracking } from '../../../../../../../core/server/services/members/import-export/tracking';

const MEMBERS = ['member_1', 'member_2', 'member_3'].map((id) => ({
  id,
  email: `${id}@example.com`,
  name: null,
  note: null,
  status: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
}));

// Stands in for the knex calls an export makes: only the members table holds rows, and
// only a whereIn narrows them.
function fakeKnex(): Knex {
  const table = (name: string) => {
    let rows = name === 'members' ? MEMBERS : [];
    const query = {
      select: () => query,
      distinct: () => query,
      where: () => query,
      groupBy: () => query,
      whereIn(_column: string, ids: string[]) {
        rows = rows.filter((row) => ids.includes(row.id));
        return query;
      },
      stream: () => Readable.from(rows),
      then: <Result>(resolve: (found: typeof rows) => Result) =>
        Promise.resolve(rows).then(resolve),
    };
    return query;
  };

  return Object.assign(table, { raw: () => null }) as unknown as Knex;
}

const ALL_IDS = MEMBERS.map((member) => member.id);

function harness(matchingIds: string[] = ALL_IDS) {
  const idLookups: ExportOptions[] = [];

  const exporter = new MembersCSVExporter({
    knex: fakeKnex(),
    members: {
      findFilteredIds: async (options) => {
        idLookups.push(options);
        return matchingIds;
      },
    },
    metafields: {
      activeDefinitions: async () => [],
      valuesForMembers: async () => new Map(),
    },
    tracking: importExportTracking(
      createTracer({ transport: { metric: async () => null }, logging: { error() {} } }),
    ),
  });

  const exportedIds = async (options: ExportOptions) => {
    const stream = await exporter.export(options);
    const rows: Array<{ id: string }> = await stream.toArray();
    return rows.map((row) => row.id);
  };

  return { idLookups, exportedIds };
}

describe('MembersCSVExporter', function () {
  // The Admin API caps `limit=all` to a number, and passes no limit when none was asked for.
  it.each([
    ['a capped limit', { limit: 100 }],
    ['no limit', {}],
  ])(
    'exports every member without looking up ids when given %s and no filter',
    async function (_name, options) {
      const { idLookups, exportedIds } = harness();

      assert.deepEqual(await exportedIds(options), ALL_IDS);
      assert.deepEqual(idLookups, []);
    },
  );

  it.each([
    ['filter', { limit: 100, filter: 'status:paid' }],
    ['search', { limit: 100, search: 'member_2' }],
  ])('exports only the members the id lookup finds for a %s', async function (_name, options) {
    const { idLookups, exportedIds } = harness(['member_2']);

    assert.deepEqual(await exportedIds(options), ['member_2']);
    assert.deepEqual(idLookups, [options]);
  });
});
