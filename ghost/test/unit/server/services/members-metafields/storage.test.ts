import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  ROOT_PATH,
  valueRowsOf,
  valueRowsToWrite,
  valuesFromRows,
} from '../../../../../core/server/services/members-metafields/storage';

// Every edge of the row model lives in these three functions, and they are pure, so this
// is the one place a unit test is cheaper than driving the HTTP boundary. The behaviour
// they add up to — a value surviving a round trip through the database — is proven in the
// members custom-fields API tests; what is proven here is the shape of each step.
describe('custom field value storage', function () {
  describe('a value becomes rows', function () {
    it('gives a value with no parts a single row at the empty path', function () {
      assert.deepEqual(valueRowsOf('Ghosts'), [{ path: ROOT_PATH, value_text: 'Ghosts' }]);
    });

    it('gives a value with parts one row each, in the order the type declares them', function () {
      assert.deepEqual(valueRowsOf({ line1: '1 High St', city: 'London' }), [
        { path: 'line1', value_text: '1 High St' },
        { path: 'city', value_text: 'London' },
      ]);
    });

    it('names an empty part too, because naming is what a write acts on', function () {
      assert.deepEqual(valueRowsOf({ line1: '1 High St', city: '' }), [
        { path: 'line1', value_text: '1 High St' },
        { path: 'city', value_text: '' },
      ]);
    });

    it('splits what a value names into what it sets and what it clears', function () {
      // A path not mentioned appears in neither list, which is how "leave it alone"
      // is expressed: by saying nothing about it.
      assert.deepEqual(
        valueRowsToWrite({ type: 'address', settings: null }, { line1: '1 High St', city: '' }),
        {
          mode: 'merge',
          set: [{ path: 'line1', value_text: '1 High St' }],
          cleared: ['city'],
        },
      );
    });
  });

  describe('rows become every member’s values', function () {
    const byPath = (_row: unknown, rows: readonly { path: string; value_text: string }[]) =>
      Object.fromEntries(rows.map(({ path, value_text: value }) => [path, value]));

    it('gathers each value from every row belonging to it', function () {
      const row = (
        memberId: string,
        namespace: string,
        key: string,
        path: string,
        value: string,
      ) => ({
        member_id: memberId,
        namespace,
        key,
        path,
        value_text: value,
      });
      const values = valuesFromRows(
        [
          row('m1', 'custom', 'home_address', 'city', 'London'),
          row('m1', 'custom', 'nickname', ROOT_PATH, 'Bex'),
          row('m2', 'custom', 'home_address', 'country', 'IE'),
          row('m1', 'custom', 'home_address', 'line1', '1 High St'),
          row('m1', 'transistor', 'nickname', ROOT_PATH, 'Becks'),
        ],
        byPath,
      );

      // m1's address arrives split by two unrelated rows; nothing depends on the
      // rows for one value being next to each other. Two namespaces can each hold a
      // `nickname` without one overwriting the other.
      assert.deepEqual(values.get('m1'), {
        custom: {
          home_address: { city: 'London', line1: '1 High St' },
          nickname: { [ROOT_PATH]: 'Bex' },
        },
        transistor: { nickname: { [ROOT_PATH]: 'Becks' } },
      });
      assert.deepEqual(values.get('m2'), { custom: { home_address: { country: 'IE' } } });
    });

    it('leaves out a namespace whose fields all read as nothing, and a member left with none', function () {
      const row = (memberId: string, namespace: string, key: string) => ({
        member_id: memberId,
        namespace,
        key,
        path: ROOT_PATH,
        value_text: 'x',
      });
      const values = valuesFromRows(
        [
          row('m1', 'custom', 'unreadable'),
          row('m1', 'transistor', 'nickname'),
          row('m2', 'custom', 'unreadable'),
        ],
        ({ key }, rows) => (key === 'unreadable' ? undefined : rows[0]?.value_text),
      );

      assert.deepEqual(values.get('m1'), { transistor: { nickname: 'x' } });
      assert.equal(values.has('m2'), false);
    });

    it('leaves a member with no rows out entirely', function () {
      assert.deepEqual([...valuesFromRows([], byPath).keys()], []);
    });
  });
});
