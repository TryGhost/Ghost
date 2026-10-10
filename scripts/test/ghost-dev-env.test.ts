import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { worktreeHostname } from '../lib/ghost-dev-env.ts';

describe('worktreeHostname', () => {
  it('turns the checkout name into a hostname', () => {
    assert.equal(
      worktreeHostname('stoic_elbakyan_14b369', 'abcdef01'),
      'stoic-elbakyan-14b369.localhost',
    );
  });

  it('keeps the label within 63 characters', () => {
    assert.equal(
      worktreeHostname(`${'a'.repeat(62)}_b`, 'abcdef01'),
      `${'a'.repeat(62)}.localhost`,
    );
  });

  it('falls back to the path hash when the name has no letters or digits', () => {
    assert.equal(worktreeHostname('', 'abcdef01'), 'wt-abcdef.localhost');
    assert.equal(worktreeHostname('_abcdef', '01234567'), 'abcdef.localhost');
  });
});
