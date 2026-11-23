import { describe, expect, it } from 'vitest';

import type { ManifestChange } from '../../src/manifest/changes-schema.ts';
import { changeRequiresApproval } from '../../src/manifest/changes.ts';
import { compareManifests, ManifestChangeSchema } from '../../src/manifest/index.ts';
import { manifest, manifestOf } from './helpers.ts';

const NAME: ManifestChange = { kind: 'field', path: 'name', requires_approval: true };
const DESCRIPTION: ManifestChange = {
  kind: 'field',
  path: 'description',
  requires_approval: false,
};

describe('changeRequiresApproval', () => {
  it('takes a field’s own rule', () => {
    expect([NAME, DESCRIPTION].map(changeRequiresApproval)).toEqual([true, false]);
  });
});

describe('ManifestChangeSchema', () => {
  it('reads back what compareManifests hands out', () => {
    const { changes } = compareManifests(
      manifestOf(manifest()),
      manifestOf(manifest({ name: 'Podcasts' })),
    );
    expect(changes.map((change) => change.kind)).toEqual(['field']);
    for (const change of changes) {
      expect(ManifestChangeSchema.parse(change)).toEqual(change);
    }
  });

  it('refuses a change without its kind, or with anything else', () => {
    for (const change of [
      { path: 'name', requires_approval: true },
      { ...NAME, x: 1 },
      { ...NAME, kind: 'access' },
    ]) {
      expect(ManifestChangeSchema.safeParse(change).success).toBe(false);
    }
  });
});
