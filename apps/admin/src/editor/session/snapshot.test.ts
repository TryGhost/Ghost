import { describe, expect, it } from 'vitest';
import type { ChangeVerdict } from '@/editor/engine/change-tracker';
import { buildSaveSnapshot, type SnapshotSources } from './snapshot';

const clean: ChangeVerdict = { dirty: false, reasons: [] };

const titleDiverged: ChangeVerdict = {
  dirty: true,
  reasons: [{ code: 'POST_TITLE_DIVERGED', reason: 'title is different', context: {} }],
};

function sources(overrides: Partial<SnapshotSources> = {}): SnapshotSources {
  return {
    identity: { id: 'abc', updatedAt: '2026-01-01T00:00:00.000Z' },
    status: 'draft',
    publishedAt: null,
    title: 'Hello',
    slug: 'hello',
    slugIsCustom: false,
    verdict: clean,
    changedSinceLastRevision: false,
    version: 3,
    ...overrides,
  };
}

describe('buildSaveSnapshot', () => {
  it('carries the persisted identity of a saved post', () => {
    expect(buildSaveSnapshot(sources())).toMatchObject({
      id: 'abc',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: 'draft',
      title: 'Hello',
      slug: 'hello',
      version: 3,
    });
  });

  it('pairs a null id with a null collision token', () => {
    const snapshot = buildSaveSnapshot(sources({ identity: { id: null, updatedAt: null } }));

    expect(snapshot.id).toBeNull();
    expect(snapshot.updatedAt).toBeNull();
  });

  it('takes dirtiness from the verdict', () => {
    expect(buildSaveSnapshot(sources()).isDirty).toBe(false);
    expect(buildSaveSnapshot(sources({ verdict: titleDiverged })).isDirty).toBe(true);
  });

  it('reads the title bit off the verdict reasons', () => {
    expect(buildSaveSnapshot(sources()).titleDirty).toBe(false);
    expect(buildSaveSnapshot(sources({ verdict: titleDiverged })).titleDirty).toBe(true);
  });

  it('reports the slug ownership and revision state it was given', () => {
    const snapshot = buildSaveSnapshot(
      sources({ slugIsCustom: true, changedSinceLastRevision: true, publishedAt: '2026-02-02' }),
    );

    expect(snapshot.slugIsCustom).toBe(true);
    expect(snapshot.changedSinceLastRevision).toBe(true);
    expect(snapshot.publishedAt).toBe('2026-02-02');
  });
});
