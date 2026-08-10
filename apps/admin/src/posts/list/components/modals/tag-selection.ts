/** A tag being added. No `id` when it is one the user just typed. */
export interface TagToAdd {
    id?: string;
    name: string;
    slug?: string;
}

/**
 * What makes two tags the same for selection.
 *
 * The id, whenever there is one. Names are not unique — a site can carry two
 * tags called "broaf" with different slugs — so comparing by name ticked and
 * unticked both at once. A tag the user has only typed has no id yet and falls
 * back to its name.
 */
export function tagKey(tag: TagToAdd): string {
    return tag.id ?? `new:${tag.name.toLowerCase()}`;
}
