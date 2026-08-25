import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  ROOT_PATH,
  leavesFor,
  leavesToWrite,
  valueFromLeaves,
  valuesFromLeaves,
} from '../../../../../core/server/services/members-custom-fields/storage';

// Every edge of the row model lives in these three functions, and they are pure, so this
// is the one place a unit test is cheaper than driving the HTTP boundary. The behaviour
// they add up to — a value surviving a round trip through the database — is proven in the
// members custom-fields API tests; what is proven here is the shape of each step.
describe('custom field value storage', function () {
  describe('a value becomes leaves', function () {
    it('gives a value with no parts a single leaf at the empty path', function () {
      assert.deepEqual(leavesFor('Ghosts'), [{ path: ROOT_PATH, value_text: 'Ghosts' }]);
    });

    it('gives a value with parts one leaf each, in the order the type declares them', function () {
      assert.deepEqual(leavesFor({ line1: '1 High St', city: 'London' }), [
        { path: 'line1', value_text: '1 High St' },
        { path: 'city', value_text: 'London' },
      ]);
    });

    it('names an empty part too, because naming is what a write acts on', function () {
      assert.deepEqual(leavesFor({ line1: '1 High St', city: '' }), [
        { path: 'line1', value_text: '1 High St' },
        { path: 'city', value_text: '' },
      ]);
    });

    it('refuses a value that is neither a string nor a record of them', function () {
      // Storing one would write a row the read path then rejects and drops, so the
      // value would be gone with nothing to say it ever arrived. Nothing reaches
      // here without being parsed first, which is what makes arriving with one a
      // mistake in the caller rather than something a member did.
      for (const value of [null, 42, true]) {
        assert.throws(() => leavesFor(value), /must be a string or a record/);
      }
    });

    it('splits what a value names into what it sets and what it clears', function () {
      // A path not mentioned appears in neither list, which is how "leave it alone"
      // is expressed: by saying nothing about it.
      assert.deepEqual(leavesToWrite({ line1: '1 High St', city: '' }), {
        set: [{ path: 'line1', value_text: '1 High St' }],
        cleared: ['city'],
      });
    });
  });

  describe('leaves become a value', function () {
    it('round-trips both shapes', function () {
      for (const value of ['Ghosts', { line1: '1 High St', city: 'London' }]) {
        assert.deepEqual(valueFromLeaves(leavesFor(value)), value);
      }
    });

    it('rebuilds a nested value from dotted paths', function () {
      // Nothing nests today, but the codec is written for a tree rather than for
      // one level, so the depth is not a case anyone has to come back and add.
      const nested = { company: { address: { city: 'London' } }, note: 'vip' };
      assert.deepEqual(
        leavesFor(nested)
          .map((l) => l.path)
          .sort(),
        ['company.address.city', 'note'],
      );
      assert.deepEqual(valueFromLeaves(leavesFor(nested)), nested);
    });

    it('reads the shape from the leaves rather than from any field type', function () {
      // A leaf at the empty path is the whole value; anything else is a part of
      // one. So a row written before its type changed reads back as what it was.
      assert.equal(valueFromLeaves([{ path: ROOT_PATH, value_text: 'Ghosts' }]), 'Ghosts');
      assert.deepEqual(valueFromLeaves([{ path: 'city', value_text: 'London' }]), {
        city: 'London',
      });
    });

    it('ignores a path naming something every object already has', function () {
      // A rebuilt value is an ordinary object, so `__proto__` as a key would reach
      // the prototype every other object shares rather than the value. No path
      // written here can contain one, and a path only has to reach the database
      // once for that to stop being a comfort.
      assert.deepEqual(
        valueFromLeaves([
          { path: '__proto__.polluted', value_text: 'yes' },
          { path: 'city', value_text: 'London' },
        ]),
        { city: 'London' },
      );
      assert.equal(({} as Record<string, unknown>).polluted, undefined);
    });

    it('rebuilds what the leaves describe when one path is a part of another', function () {
      // Impossible from anything written through here, and still worth settling:
      // this runs over every member of a list response, so guessing wrong should
      // cost one odd value rather than the whole response.
      //
      // The deeper leaf wins because it arrives second, and it arrives second
      // because the read orders by path — 'company' sorts before 'company.city'.
      assert.deepEqual(
        valueFromLeaves([
          { path: 'company', value_text: 'Ghost' },
          { path: 'company.city', value_text: 'London' },
        ]),
        { company: { city: 'London' } },
      );
    });
  });

  describe('rows become every member’s values', function () {
    it('gathers each value from every row belonging to it', function () {
      const values = valuesFromLeaves([
        { member_id: 'm1', key: 'home_address', path: 'city', value_text: 'London' },
        { member_id: 'm1', key: 'nickname', path: ROOT_PATH, value_text: 'Bex' },
        { member_id: 'm2', key: 'home_address', path: 'country', value_text: 'IE' },
        { member_id: 'm1', key: 'home_address', path: 'line1', value_text: '1 High St' },
      ]);

      // m1's address arrives split by two unrelated rows; nothing depends on the
      // rows for one value being next to each other.
      assert.deepEqual(values.get('m1'), {
        home_address: { city: 'London', line1: '1 High St' },
        nickname: 'Bex',
      });
      assert.deepEqual(values.get('m2'), { home_address: { country: 'IE' } });
    });

    it('leaves a member with no rows out entirely', function () {
      assert.deepEqual([...valuesFromLeaves([]).keys()], []);
    });
  });
});
