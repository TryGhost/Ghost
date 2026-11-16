import assert from 'node:assert/strict';

const {
  domainSettingGroups,
  domainTables,
  placeFromDomains,
}: typeof import('../../../../core/foundation/domains/fragments') = require('../../../../core/foundation/domains/fragments');

describe('domain fragments for the central registries', function () {
  // The settings model adds `group`, `key` and a function to every default
  // setting it reads. What a domain declared must be the same afterwards.
  it('hands out settings a registry can add to without changing what the domain declared', function () {
    const first = domainSettingGroups();
    for (const group of Object.values(first)) {
      for (const setting of Object.values(group) as Record<string, unknown>[]) {
        setting.group = 'changed';
        setting.added = () => {};
      }
    }

    const second = domainSettingGroups();
    assert.notEqual(second, first);
    for (const group of Object.values(second)) {
      for (const setting of Object.values(group) as Record<string, unknown>[]) {
        assert.equal(setting.group, undefined);
        assert.equal(setting.added, undefined);
      }
    }
  });

  it('hands out tables a reader can change without changing what the domain declared', function () {
    const first = domainTables() as Record<string, Record<string, unknown>>;
    const [name] = Object.keys(first);
    assert.ok(name, 'A domain declares at least one table');
    first[name]!.added = { type: 'string' };

    assert.equal(
      (domainTables() as Record<string, Record<string, unknown>>)[name]!.added,
      undefined,
    );
  });

  describe('placeFromDomains', function () {
    it('keeps a named entry where it is named and appends the rest', function () {
      const from = placeFromDomains('table', { b: 2, a: 1, c: 3 });
      const merged = { first: 0, ...from.place('c', 'a'), last: 9, ...from.rest() };
      assert.deepEqual(Object.entries(merged), [
        ['first', 0],
        ['c', 3],
        ['a', 1],
        ['last', 9],
        ['b', 2],
      ]);
    });

    it('refuses to place an entry no domain declares', function () {
      const from = placeFromDomains('table', { a: 1 });
      assert.throws(
        () => from.place('missing'),
        /places the table missing, but no domain declares it/,
      );
    });
  });
});
