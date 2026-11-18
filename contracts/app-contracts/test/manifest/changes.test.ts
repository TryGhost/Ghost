import { describe, expect, it } from 'vitest';

import {
  changeRequiresApproval,
  isAccessChange,
  isFieldChange,
  splitChanges,
  type ManifestChange,
} from '../../src/manifest/changes.ts';
import { compareManifests, ManifestChangeSchema } from '../../src/manifest/index.ts';
import { manifest, manifestOf } from './helpers.ts';

const NAME: ManifestChange = { kind: 'field', path: 'name', requires_approval: true };
const DESCRIPTION: ManifestChange = {
  kind: 'field',
  path: 'description',
  requires_approval: false,
};
const READ: ManifestChange = {
  kind: 'access',
  scope: 'post:read',
  change: 'added',
  backend: false,
};

describe('isFieldChange and isAccessChange', () => {
  it('tell a change apart by its kind', () => {
    expect([NAME, READ].map(isFieldChange)).toEqual([true, false]);
    expect([NAME, READ].map(isAccessChange)).toEqual([false, true]);
  });
});

describe('splitChanges', () => {
  it('splits fields from access changes, keeping each in order', () => {
    expect(splitChanges([NAME, READ, DESCRIPTION])).toEqual({
      fields: [NAME, DESCRIPTION],
      access: [READ],
    });
  });
});

describe('changeRequiresApproval', () => {
  it('takes a field’s own rule, and needs approval for access only when it widens', () => {
    expect(
      [
        NAME,
        DESCRIPTION,
        READ,
        { ...READ, change: 'backend_added', backend: true },
        { ...READ, change: 'removed' },
        { ...READ, change: 'backend_removed' },
      ].map((change) => changeRequiresApproval(change as ManifestChange)),
    ).toEqual([true, false, true, true, false, false]);
  });
});

describe('ManifestChangeSchema', () => {
  it('reads back what compareManifests hands out', () => {
    const { changes } = compareManifests(
      manifestOf(manifest()),
      manifestOf(
        manifest({
          name: 'Podcasts',
          access: { post: { scopes: [{ name: 'post:read', backend: true }] } },
        }),
      ),
    );
    expect(changes.map((change) => change.kind)).toEqual(['field', 'access']);
    for (const change of changes) {
      expect(ManifestChangeSchema.parse(change)).toEqual(change);
    }
  });

  it('refuses a change without its kind, with an unknown scope or with anything else', () => {
    for (const change of [
      { path: 'name', requires_approval: true },
      { ...READ, scope: 'post:publish' },
      { ...READ, x: 1 },
      { ...NAME, kind: 'access' },
    ]) {
      expect(ManifestChangeSchema.safeParse(change).success).toBe(false);
    }
  });
});
