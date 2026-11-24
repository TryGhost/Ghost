import { describe, expect, it } from 'vitest';

import {
  changeRequiresApproval,
  isScopeChange,
  isFieldChange,
  splitChanges,
} from '../../src/manifest/changes.ts';
import type { ManifestChange } from '../../src/manifest/changes-schema.ts';
import { compareManifests, ManifestChangeSchema } from '../../src/manifest/index.ts';
import { manifest, manifestOf } from './helpers.ts';

const NAME: ManifestChange = { kind: 'field', path: 'name', requires_approval: true };
const DESCRIPTION: ManifestChange = {
  kind: 'field',
  path: 'description',
  requires_approval: false,
};
const READ: ManifestChange = {
  kind: 'scope',
  scope: 'post:read',
  change: 'added',
};

describe('isFieldChange and isScopeChange', () => {
  it('tell a change apart by its kind', () => {
    expect([NAME, READ].map(isFieldChange)).toEqual([true, false]);
    expect([NAME, READ].map(isScopeChange)).toEqual([false, true]);
  });
});

describe('splitChanges', () => {
  it('splits fields from scope changes, keeping each in order', () => {
    expect(splitChanges([NAME, READ, DESCRIPTION])).toEqual({
      fields: [NAME, DESCRIPTION],
      scopes: [READ],
    });
  });
});

describe('changeRequiresApproval', () => {
  it('takes a field’s own rule, and needs approval for access only when it widens', () => {
    expect(
      [NAME, DESCRIPTION, READ, { ...READ, change: 'removed' }].map((change) =>
        changeRequiresApproval(change as ManifestChange),
      ),
    ).toEqual([true, false, true, false]);
  });
});

describe('ManifestChangeSchema', () => {
  it('reads back what compareManifests hands out', () => {
    const { changes } = compareManifests(
      manifestOf(manifest()),
      manifestOf(
        manifest({
          name: 'Podcasts',
          scopes: ['post:read'],
        }),
      ),
    );
    expect(changes.map((change) => change.kind)).toEqual(['field', 'scope']);
    for (const change of changes) {
      expect(ManifestChangeSchema.parse(change)).toEqual(change);
    }
  });

  it('refuses a change without its kind, with an unknown scope or with anything else', () => {
    for (const change of [
      { path: 'name', requires_approval: true },
      { ...READ, scope: 'post:publish' },
      { ...READ, x: 1 },
      { ...NAME, kind: 'scope' },
    ]) {
      expect(ManifestChangeSchema.safeParse(change).success).toBe(false);
    }
  });
});
