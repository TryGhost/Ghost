import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import MembersCSVImporter from '../../../../../../../core/server/services/members/import-export/import/importer';
import type { MemberImportRow } from '../../../../../../../core/server/services/members/import-export/import/row';
import { createTracer } from '../../../../../../../core/server/lib/tracing/create-tracer';
import { importExportTracking } from '../../../../../../../core/server/services/members/import-export/tracking';

interface Newsletter {
  id: string;
  name: string;
  status: 'active' | 'archived';
}

const DAILY: Newsletter = { id: 'nl_daily', name: 'Daily', status: 'active' };
const WEEKLY: Newsletter = { id: 'nl_weekly', name: 'Weekly', status: 'active' };
const OLD: Newsletter = { id: 'nl_old', name: 'Old', status: 'archived' };

interface Write {
  op: 'create' | 'update';
  newsletters?: Array<{ id: string }>;
  subscribed?: boolean;
}

// Imports one row and returns the member write it produced, against a site whose active
// newsletters are DAILY and WEEKLY. `existing` is the member's current subscriptions, or
// absent for a new member.
async function importRow(cells: Partial<MemberImportRow>, existing?: Newsletter[]) {
  const writes: Write[] = [];
  const member = {
    id: 'member_1',
    name: '',
    note: '',
    related: (relation: string) => {
      const items = relation === 'newsletters' ? (existing ?? []) : [];
      return { toJSON: () => items, length: items.length };
    },
  };
  const record =
    (op: Write['op']) =>
    async (values: { newsletters?: Array<{ id: string }>; subscribed?: boolean }) => {
      writes.push({
        op,
        newsletters: values.newsletters?.map(({ id }) => ({ id })),
        subscribed: values.subscribed,
      });
      return member;
    };
  const knex = Object.assign(() => ({ select: () => ({ where: async () => [DAILY, WEEKLY] }) }), {
    transaction: async () => ({ commit: async () => {}, rollback: async () => {} }),
  }) as unknown as Knex;

  const importer = new MembersCSVImporter({
    knex,
    readRows: async () => [{ email: 'member@example.com', labels: [], ...cells }],
    spool: {
      write: async () => 'unused',
      read: async () => [],
      remove: async () => {},
    },
    members: {
      get: async () => (existing ? member : null),
      create: record('create'),
      update: record('update'),
      getCustomerIdByEmail: async () => undefined,
      linkStripeCustomer: async () => {},
      getImportLabel: async () => null,
    },
    tiers: {
      getDefault: async () => ({ id: 'tier_default' }),
      getByName: async () => null,
    },
    stripe: {
      forceStripeSubscriptionToProduct: async () => ({
        isNewStripePrice: false,
        stripePriceId: '',
      }),
      archivePrice: async () => {},
    },
    gifts: { reassignRedeemer: async () => {} },
    metafields: {
      activeFields: async () => [],
      planWrite: async () => [],
      applyWrite: async () => {},
    },
    email: {
      send: async () => {},
      getDefaultRecipient: async () => 'owner@example.com',
      links: {
        siteUrl: () => new URL('http://localhost/'),
        membersUrl: () => new URL('http://localhost/ghost/members'),
      },
    },
    report: (error: unknown) => {
      throw error;
    },
    dispatchJob: async () => {},
    getTimezone: () => 'Etc/UTC',
    getInlineThreshold: () => 1000,
    tracking: importExportTracking(
      createTracer({ transport: { metric: async () => null }, logging: { error() {} } }),
    ),
  });

  const result = await importer.importInline(
    { filePath: 'members.csv', requestUserEmail: null },
    { testImportThreshold: async () => {} },
  );
  assert.deepEqual(result.errors, []);
  assert.equal(writes.length, 1);
  return writes[0];
}

const names = (...list: string[]) => list.map((name) => ({ name }));

// The repository adds every listed newsletter the member lacks, and reads subscribed=true
// with no list as "subscribe to the signup defaults" when they have no active newsletter.
function assertAddsNoNewsletter(write: Write, existing: Newsletter[]) {
  if (write.newsletters) {
    const had = existing.map(({ id }) => id);
    assert.deepEqual(
      write.newsletters.filter(({ id }) => !had.includes(id)),
      [],
    );
  } else {
    assert.notEqual(write.subscribed, true);
  }
}

describe('members import newsletters column', function () {
  describe('an existing member', function () {
    it('is never subscribed when they have no active newsletters', async function () {
      for (const existing of [[], [OLD]]) {
        for (const cells of [
          { subscribed: true, newsletters: names('Daily') },
          { newsletters: names('Daily') },
        ]) {
          assertAddsNoNewsletter(await importRow(cells, existing), existing);
        }
      }
    });

    it('has their active newsletters set to exactly the ones the cell names', async function () {
      const write = await importRow({ subscribed: true, newsletters: names('Daily', 'Renamed') }, [
        WEEKLY,
        OLD,
      ]);
      assert.deepEqual(write.newsletters, [{ id: DAILY.id }]);
    });

    it('is left alone by a blank cell or one naming no active newsletter', async function () {
      for (const newsletters of [[], names('Renamed', 'Old')]) {
        const write = await importRow({ subscribed: true, newsletters }, [WEEKLY]);
        assert.deepEqual(write.newsletters, [{ id: WEEKLY.id }]);
      }
    });

    it('is unsubscribed by subscribed_to_emails=false whatever the cell names', async function () {
      const write = await importRow({ subscribed: false, newsletters: names('Daily') }, [WEEKLY]);
      assert.equal(write.newsletters, undefined);
      assert.equal(write.subscribed, false);
    });
  });

  describe('a new member', function () {
    it('is subscribed to the newsletters the cell names instead of the signup defaults', async function () {
      const write = await importRow({ subscribed: true, newsletters: names('Weekly') });
      assert.equal(write.op, 'create');
      assert.deepEqual(write.newsletters, [{ id: WEEKLY.id }]);
    });

    it('gets the signup defaults from a blank cell or one naming no active newsletter', async function () {
      for (const newsletters of [[], names('Renamed')]) {
        const write = await importRow({ subscribed: true, newsletters });
        assert.equal(write.op, 'create');
        assert.equal(write.newsletters, undefined);
        assert.equal(write.subscribed, true);
      }
    });

    it('gets no newsletters when subscribed_to_emails is false', async function () {
      const write = await importRow({ subscribed: false, newsletters: names('Weekly') });
      assert.equal(write.newsletters, undefined);
      assert.equal(write.subscribed, false);
    });
  });
});
