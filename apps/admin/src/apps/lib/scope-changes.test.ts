import { describe, expect, it } from 'vitest';
import type { ScopeChange } from '@tryghost/app-contracts';
import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';
import { describeScopeChanges, historyScopeChanges, markScopeChanges } from './scope-changes';

describe('describeScopeChanges', () => {
  it('groups changes by kind, one line per resource in the registry’s words', () => {
    expect(
      describeScopeChanges([
        { kind: 'scope', scope: 'tag:edit', change: 'added' },
        { kind: 'scope', scope: 'post:read', change: 'added' },
        { kind: 'scope', scope: 'product:browse', change: 'removed' },
      ]).map(({ kind, heading, lines }) => [
        kind,
        heading,
        lines.map(({ title, actions }) => `${title}: ${actions.join(' ')}`),
      ]),
    ).toEqual([
      [
        'added',
        'Permissions approved',
        ['Posts and pages: Read any post or page.', 'Tags: Edit tags.'],
      ],
      ['removed', 'No longer requires', ['Tiers: List your tiers and their prices.']],
    ]);
  });

  it('is empty when access didn’t change', () => {
    expect(describeScopeChanges([])).toEqual([]);
  });

  it('words a suspension’s changes as what the update requires', () => {
    expect(
      describeScopeChanges(
        [
          { kind: 'scope', scope: 'post:edit', change: 'added' },
          { kind: 'scope', scope: 'product:browse', change: 'removed' },
        ],
        { pending: true },
      ).map(({ heading }) => heading),
    ).toEqual(['Requested', 'Would no longer require']);
  });
});

describe('markScopeChanges', () => {
  it('marks new scopes and lists what the app no longer requires', () => {
    const marks = markScopeChanges([
      { kind: 'scope', scope: 'post:edit', change: 'added' },
      { kind: 'scope', scope: 'product:browse', change: 'removed' },
    ]);
    expect([...marks.added]).toEqual(['post:edit']);
    expect(marks.removed.map(({ title }) => title)).toEqual(['Tiers']);
  });
});

describe('historyScopeChanges', () => {
  const added = (scope: ScopeChange['scope']): ScopeChange => ({
    kind: 'scope',
    scope,
    change: 'added',
  });
  const entry = (
    event: AppInstallationHistoryEntry['event'],
    changes: ScopeChange[] = [],
  ): AppInstallationHistoryEntry => ({
    id: event,
    event,
    actor: null,
    created_at: '2026-10-01T10:00:00.000Z',
    changes,
  });

  it('leaves out a suspension’s changes once an approval granted exactly them', () => {
    expect(
      historyScopeChanges([
        entry('changes_approved', [added('post:edit')]),
        entry('suspended', [added('post:edit')]),
      ]),
    ).toEqual([[added('post:edit')], []]);
  });

  it('keeps what a suspension asked for when it was replaced, withdrawn or is still waiting', () => {
    expect(
      historyScopeChanges([
        entry('changes_approved', [added('post:edit')]),
        entry('suspended', [added('post:edit')]),
        entry('suspended', [added('tag:edit')]),
      ])[2],
    ).toEqual([added('tag:edit')]);
    expect(
      historyScopeChanges([entry('resumed'), entry('suspended', [added('tag:edit')])])[1],
    ).toEqual([added('tag:edit')]);
    expect(historyScopeChanges([entry('suspended', [added('tag:edit')])])[0]).toEqual([
      added('tag:edit'),
    ]);
  });

  it('keeps a suspension’s changes when the approval granted a different version', () => {
    expect(
      historyScopeChanges([
        entry('changes_approved', [added('post:edit'), added('tag:edit')]),
        entry('suspended', [added('post:edit')]),
      ])[1],
    ).toEqual([added('post:edit')]);
  });
});
