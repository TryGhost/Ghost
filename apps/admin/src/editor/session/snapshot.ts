import type { PersistedIdentity, PostStatus, SaveSnapshot } from '@/editor/engine/save-engine';
import type { ChangeVerdict } from '@/editor/engine/change-tracker';

export type EditorSaveSnapshot = SaveSnapshot & {
  titleDirty: boolean;
  slugIsCustom: boolean;
};

export interface SnapshotSources {
  identity: PersistedIdentity;
  status: PostStatus;
  publishedAt: string | null;
  title: string;
  slug: string;
  slugIsCustom: boolean;
  verdict: ChangeVerdict;
  changedSinceLastRevision: boolean;
  version: number;
}

export function buildSaveSnapshot({
  identity,
  status,
  publishedAt,
  title,
  slug,
  slugIsCustom,
  verdict,
  changedSinceLastRevision,
  version,
}: SnapshotSources): EditorSaveSnapshot {
  const editable = {
    status,
    publishedAt,
    title,
    slug,
    slugIsCustom,
    isDirty: verdict.dirty,
    titleDirty: verdict.reasons.some((reason) => reason.code === 'POST_TITLE_DIVERGED'),
    changedSinceLastRevision,
    version,
  };

  return identity.id === null
    ? { id: null, updatedAt: null, ...editable }
    : { id: identity.id, updatedAt: identity.updatedAt, ...editable };
}
