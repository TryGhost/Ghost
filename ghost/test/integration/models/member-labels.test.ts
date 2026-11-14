import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error Module has no type declarations.
import DomainEvents from '@tryghost/domain-events';
import { LabelAddedToMembersEvent } from '../../../core/shared/events/label-added-to-members-event';

interface LabelRow {
  id: string;
  name: string;
}

interface LabelLookup {
  sql: string;
  rows: LabelRow[];
}

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const knex = require('../../../core/server/data/db').knex;

describe('Member Model: saving labels', function () {
  // Unrelated labels a save must not read: each member save used to load the whole
  // labels table, which made row-by-row imports slow down as a site's labels grew.
  const UNRELATED_LABEL_COUNT = 50;

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());
  afterAll(testUtils.teardownDb);

  beforeAll(async function () {
    await models.Label.add({ name: 'VIP' }, testUtils.context.internal);
    await models.Label.add({ name: 'Ärger' }, testUtils.context.internal);

    const rows: Array<LabelRow & { slug: string; created_at: Date }> = [];
    for (let idx = 0; idx < UNRELATED_LABEL_COUNT; idx++) {
      rows.push({
        id: models.Base.Model.generateId(),
        name: `Unrelated ${idx}`,
        slug: `unrelated-${idx}`,
        created_at: new Date(),
      });
    }
    await knex.batchInsert('labels', rows, 50);
  });

  // Records the label lookups a save runs, with the rows each one returned.
  async function captureLabelLookups(fn: () => Promise<unknown>): Promise<LabelLookup[]> {
    const lookups: LabelLookup[] = [];
    const onResponse = (response: LabelRow[], query: { sql: string }) => {
      if (/^select [`"]id[`"], [`"]name[`"] from [`"]labels[`"]/i.test(query.sql)) {
        lookups.push({ sql: query.sql, rows: response });
      }
    };

    knex.on('query-response', onResponse);
    try {
      await fn();
      return lookups;
    } finally {
      knex.removeListener('query-response', onResponse);
    }
  }

  async function attachedLabels(memberId: string): Promise<LabelRow[]> {
    const member = await models.Member.findOne(
      { id: memberId },
      { ...testUtils.context.internal, withRelated: ['labels'] },
    );
    return member.related('labels').map((label: { id: string; get(key: string): string }) => ({
      id: label.id,
      name: label.get('name'),
    }));
  }

  async function labelsNamed(name: string): Promise<LabelRow[]> {
    return knex('labels').whereRaw('LOWER(name) = ?', [name.toLowerCase()]);
  }

  it('attaches an existing label that differs only in case instead of creating a new one', async function () {
    const member = await models.Member.add(
      { email: 'case-insensitive@example.com', email_disabled: false, labels: [{ name: 'vip' }] },
      testUtils.context.internal,
    );

    const attached = await attachedLabels(member.id);
    const vipLabels = await labelsNamed('VIP');

    assert.equal(vipLabels.length, 1, 'no duplicate label should be created');
    assert.deepEqual(
      attached.map((label) => label.name),
      ['VIP'],
    );
    assert.equal(attached[0].id, vipLabels[0].id);
  });

  it('creates labels that do not exist yet', async function () {
    const member = await models.Member.add(
      {
        email: 'new-label@example.com',
        email_disabled: false,
        labels: [{ name: 'VIP' }, { name: 'Brand New' }],
      },
      testUtils.context.internal,
    );

    const attached = await attachedLabels(member.id);

    assert.deepEqual(attached.map((label) => label.name).sort(), ['Brand New', 'VIP']);
    assert.equal((await labelsNamed('Brand New')).length, 1);
  });

  it('matches existing labels case-insensitively when editing a member', async function () {
    const member = await models.Member.add(
      { email: 'edit-labels@example.com', email_disabled: false },
      testUtils.context.internal,
    );

    await models.Member.edit(
      { labels: [{ name: 'brand new' }] },
      { ...testUtils.context.internal, id: member.id },
    );

    const attached = await attachedLabels(member.id);

    assert.deepEqual(
      attached.map((label) => label.name),
      ['Brand New'],
    );
    assert.equal((await labelsNamed('Brand New')).length, 1);
  });

  it('reuses an existing label whose non-ASCII name differs only in case', async function () {
    const member = await models.Member.add(
      { email: 'non-ascii@example.com', email_disabled: false, labels: [{ name: 'ärger' }] },
      testUtils.context.internal,
    );

    const attached = await attachedLabels(member.id);

    assert.deepEqual(
      attached.map((label) => label.name),
      ['Ärger'],
    );
    assert.equal((await labelsNamed('Ärger')).length, 1);
  });

  // DB-backed suites run on MySQL, so this covers the indexed lookup only.
  it('reads only the labels the save names, not the whole labels table', async function () {
    const lookups = await captureLabelLookups(() =>
      models.Member.add(
        { email: 'scoped-read@example.com', email_disabled: false, labels: [{ name: 'Vip' }] },
        testUtils.context.internal,
      ),
    );

    assert.equal(lookups.length, 1, 'expected one label lookup for the save');
    assert.deepEqual(
      lookups[0].rows.map((row) => row.name),
      ['VIP'],
    );
  });

  describe('label addition events', function () {
    let dispatch: sinon.SinonSpy;

    beforeEach(function () {
      dispatch = sinon.spy(DomainEvents, 'dispatch');
    });

    afterEach(function () {
      dispatch.restore();
    });

    const getLabelAddedToMembersDomainEvents = () =>
      dispatch.args
        .map(([event]) => event)
        // CommonJS server and Vitest can load separate event constructors.
        .filter((event) => event.constructor.name === LabelAddedToMembersEvent.name)
        .map((event) => event.data);

    it('emits a "label added to members" domain event', async function () {
      const memberId: string = await models.Member.transaction(async (transacting: unknown) => {
        const member = await models.Member.add(
          {
            email_disabled: false,
            email: 'label-event-import@example.com',
            labels: [{ name: 'VIP' }, { name: 'Import Event' }],
          },
          { ...testUtils.context.internal, importing: true, transacting },
        );
        assert.deepEqual(
          getLabelAddedToMembersDomainEvents(),
          [],
          'events should only happen after the transaction ends',
        );
        return member.id;
      });

      const labels = await attachedLabels(memberId);

      const compare = (a: { labelId: string }, b: { labelId: string }) =>
        a.labelId.localeCompare(b.labelId);
      const actualDomainEvents = getLabelAddedToMembersDomainEvents().toSorted(compare);
      const expectedDomainEvents = labels
        .map((label) => ({ labelId: label.id, memberIds: [memberId] }))
        .toSorted(compare);
      assert.deepEqual(actualDomainEvents, expectedDomainEvents);
    });

    it('ignores existing assignments, removal, and unrelated edits; emits again on re-add', async function () {
      const member = await models.Member.add(
        { email_disabled: false, email: 'label-event-edit@example.com', labels: [{ name: 'VIP' }] },
        testUtils.context.internal,
      );
      const options = { ...testUtils.context.internal, id: member.id };

      dispatch.resetHistory();

      await models.Member.edit({ labels: [{ name: 'vip' }], name: 'Changed name' }, options);
      await models.Member.edit({ labels: [] }, options);

      assert.deepEqual(getLabelAddedToMembersDomainEvents(), []);

      await models.Member.edit({ labels: [{ name: 'VIP' }, { name: 'Added Event' }] }, options);

      assert.equal(getLabelAddedToMembersDomainEvents().length, 2);
      assert.ok(
        getLabelAddedToMembersDomainEvents().every((event) => event.memberIds[0] === member.id),
      );
    });

    it('emits nothing if transaction fails', async function () {
      const email = 'label-event-rollback@example.com';
      await assert.rejects(
        models.Member.transaction(async (transacting: unknown) => {
          await models.Member.add(
            { email_disabled: false, email, labels: [{ name: 'VIP' }] },
            { ...testUtils.context.internal, transacting },
          );
          throw new Error('rollback');
        }),
        /rollback/,
      );
      assert.equal(await models.Member.findOne({ email }), null);

      assert.deepEqual(getLabelAddedToMembersDomainEvents(), []);
    });

    it('dedupes repeated edits in the same transaction', async function () {
      const member = await models.Member.add(
        { email_disabled: false, email: 'label-event-repeated@example.com' },
        testUtils.context.internal,
      );
      await models.Member.transaction(async (transacting: unknown) => {
        const options = { ...testUtils.context.internal, id: member.id, transacting };
        await models.Member.edit({ labels: [{ name: 'VIP' }] }, options);
        await models.Member.edit({ labels: [] }, options);
      });

      assert.equal(getLabelAddedToMembersDomainEvents().length, 1);
    });
  });
});
