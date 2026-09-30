import type { MemberMetafields } from '../members-metafields';

/** The part of a member model that records what a save changed. */
interface ChangeTracked {
  _changed?: Record<string, unknown> & { metafields?: MemberMetafields };
}

/**
 * Records the metafields an edit replaced as a change to the member model, inside the
 * edit's transaction. Metafields aren't member columns, so the save doesn't count them.
 * Recording them lets the `member.edited` event the save queued fire at commit, with
 * them in the webhook's `previous`.
 */
export function recordReplacedMetafields(member: ChangeTracked, replaced: MemberMetafields): void {
  member._changed = { ...member._changed, metafields: replaced };
}

/** The metafields an edit replaced, as `recordReplacedMetafields` recorded them. */
export function replacedMetafields(member: ChangeTracked): MemberMetafields | undefined {
  return member._changed?.metafields;
}
