/** A tag as a picker carries one: a tag the user has typed has a name and nothing else. */
export interface TagLike {
  id?: string;
  name?: string;
  slug?: string;
  visibility?: string;
}

/** A tag as it is handed to a consumer: an existing one keeps its identity, a typed one its name. */
export interface PickedTag {
  id?: string;
  name: string;
  slug?: string;
}

export function tagName(tag: TagLike): string {
  return tag.name ?? '';
}

/** Trailing and leading space is never part of a tag name; the server trims it too. */
export function normalizeTagName(value: string): string {
  return value.trim();
}

/**
 * Ghost makes a tag internal when its name starts with `#` and applies that rule
 * on save, so a typed name reads as internal before the tag comes back.
 */
export function isInternalTag(tag: TagLike): boolean {
  return tag.visibility === 'internal' || tagName(tag).startsWith('#');
}

/**
 * Names are not unique — a site can carry two tags called "broaf" with
 * different slugs — so identity is the id whenever both sides have one.
 */
export function sameTag(a: TagLike, b: TagLike): boolean {
  if (a.id && b.id) {
    return a.id === b.id;
  }
  return tagName(a).toLowerCase() === tagName(b).toLowerCase();
}

/** A tag as a post's payload carries one: the id of an existing tag, the name of a typed one. */
export type TagIdentity = { id: string } | { name: string };

// `bookshelf-relations` sets every property it is sent onto the tag row and
// saves the row when one differs, so anything past the identity reverts the tag.
export function tagIdentities(tags: ReadonlyArray<TagLike>): TagIdentity[] {
  return tags.map((tag) => (tag.id ? { id: tag.id } : { name: tagName(tag) }));
}

/** A stable key for one tag in a selection: its id, or the name it was typed as. */
export function tagKey(tag: TagLike): string {
  return tag.id ?? `new:${tagName(tag).toLowerCase()}`;
}

/**
 * Appends a tag, or returns the list unchanged — the same array, so the caller
 * can tell a no-op from an edit.
 */
export function addTag(tags: ReadonlyArray<TagLike>, tag: TagLike): ReadonlyArray<TagLike> {
  if (tagName(tag) === '' || tags.some((existing) => sameTag(existing, tag))) {
    return tags;
  }

  return [...tags, tag];
}

/** Removes one tag, leaving the order of the rest alone: it is the post's `sort_order`. */
export function removeTag<T extends TagLike>(
  tags: ReadonlyArray<T>,
  key: string,
): ReadonlyArray<T> {
  return tags.filter((tag) => tagKey(tag) !== key);
}

/** Punctuation is ignored so a `#internal` tag files under its letters, not above A. */
export function sortTagsByName<T extends TagLike>(tags: ReadonlyArray<T>): T[] {
  return [...tags].sort((a, b) =>
    tagName(a).localeCompare(tagName(b), undefined, { ignorePunctuation: true }),
  );
}

/**
 * Whether the term is worth offering as a new tag. Anything already carrying
 * that name — offered a row below, or selected already — would be a duplicate.
 */
export function canCreateTag(
  term: string,
  offered: ReadonlyArray<TagLike>,
  selected: ReadonlyArray<TagLike>,
): boolean {
  if (term === '') {
    return false;
  }

  const name = term.toLowerCase();

  return ![...offered, ...selected].some((tag) => tagName(tag).toLowerCase() === name);
}
