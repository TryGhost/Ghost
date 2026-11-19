import { describe, expect, it } from 'vitest';
import type { AccessChange } from '@tryghost/app-contracts';
import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';
import { describeAccessChanges, historyAccessChanges, markAccessChanges } from './access-changes';

describe('describeAccessChanges', () => {
  it('groups changes by kind, one line per resource in the registry’s words', () => {
    expect(
      describeAccessChanges([
        { kind: 'access', scope: 'tag:edit', change: 'added', backend: false },
        { kind: 'access', scope: 'post:read', change: 'added', backend: true },
        { kind: 'access', scope: 'post:browse', change: 'backend_added', backend: true },
        { kind: 'access', scope: 'product:browse', change: 'removed', backend: true },
        { kind: 'access', scope: 'post:edit', change: 'backend_removed', backend: false },
      ]).map(({ kind, heading, lines }) => [
        kind,
        heading,
        lines.map(({ title, actions }) => `${title}: ${actions.join(' ')}`),
      ]),
    ).toEqual([
      ['added', 'New access', ['Posts and pages: Read any post or page.', 'Tags: Edit tags.']],
      [
        'backend_added',
        'New for its backend, at any time',
        [
          'Posts and pages: List, search and read every post and page, drafts included. Read any post or page.',
        ],
      ],
      ['removed', 'No longer has', ['Tiers: List your tiers and their prices.']],
      [
        'backend_removed',
        'No longer for its backend, at any time',
        [
          'Posts and pages: Edit, publish and email posts and pages, change who can read them and their authors, and create tags for them.',
          'Tiers: List your tiers and their prices.',
        ],
      ],
    ]);
  });

  it('is empty when access didn’t change', () => {
    expect(describeAccessChanges([])).toEqual([]);
  });

  it('words a suspension’s changes as what it asked for', () => {
    expect(
      describeAccessChanges(
        [
          { kind: 'access', scope: 'post:edit', change: 'added', backend: true },
          { kind: 'access', scope: 'product:browse', change: 'removed', backend: false },
        ],
        { pending: true },
      ).map(({ heading }) => heading),
    ).toEqual(['Asked for', 'Asked for its backend, at any time', 'Would drop']);
  });
});

describe('markAccessChanges', () => {
  it('marks new scopes for the app and its backend, and lists what each no longer has', () => {
    const marks = markAccessChanges([
      { kind: 'access', scope: 'post:edit', change: 'added', backend: true },
      { kind: 'access', scope: 'post:browse', change: 'backend_added', backend: true },
      { kind: 'access', scope: 'product:browse', change: 'removed', backend: true },
      { kind: 'access', scope: 'tag:browse', change: 'backend_removed', backend: false },
    ]);
    expect([...marks.added]).toEqual(['post:edit']);
    expect([...marks.backendAdded]).toEqual(['post:edit', 'post:browse']);
    expect(marks.removed.map(({ title }) => title)).toEqual(['Tiers']);
    expect(marks.backendRemoved.map(({ title }) => title)).toEqual(['Tags', 'Tiers']);
  });
});

describe('historyAccessChanges', () => {
  const access = (scope: AccessChange['scope']): AccessChange => ({
    kind: 'access',
    scope,
    change: 'added',
    backend: false,
  });
  const entry = (
    event: AppInstallationHistoryEntry['event'],
    changes: AccessChange[] = [],
  ): AppInstallationHistoryEntry => ({
    id: event,
    event,
    actor: null,
    created_at: '2026-10-01T10:00:00.000Z',
    changes,
  });

  it('leaves out a suspension’s changes once an approval granted exactly them', () => {
    expect(
      historyAccessChanges([
        entry('changes_approved', [access('post:edit')]),
        entry('suspended', [access('post:edit')]),
      ]),
    ).toEqual([[access('post:edit')], []]);
  });

  it('keeps what a suspension asked for when it was replaced, withdrawn or is still waiting', () => {
    expect(
      historyAccessChanges([
        entry('changes_approved', [access('post:edit')]),
        entry('suspended', [access('post:edit')]),
        entry('suspended', [access('tag:edit')]),
      ])[2],
    ).toEqual([access('tag:edit')]);
    expect(
      historyAccessChanges([entry('resumed'), entry('suspended', [access('tag:edit')])])[1],
    ).toEqual([access('tag:edit')]);
    expect(historyAccessChanges([entry('suspended', [access('tag:edit')])])[0]).toEqual([
      access('tag:edit'),
    ]);
  });

  it('keeps a suspension’s changes when the approval granted a different version', () => {
    expect(
      historyAccessChanges([
        entry('changes_approved', [access('post:edit'), access('tag:edit')]),
        entry('suspended', [access('post:edit')]),
      ])[1],
    ).toEqual([access('post:edit')]);
  });
});
