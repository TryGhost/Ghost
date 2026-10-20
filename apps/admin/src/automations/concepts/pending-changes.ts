// NY-1715 exploration only — never merge.
export type PendingChangesKind = 'unsaved' | 'unpublished';

export const pendingChangesKind = (status: string | undefined): PendingChangesKind =>
  status === 'active' ? 'unpublished' : 'unsaved';
