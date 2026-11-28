/**
 * How a published post is shared on the social web (ActivityPub).
 *
 * - `article`: the full post
 * - `note`: a short note with the title and excerpt (or custom text) and a link
 * - `none`: the post is not shared
 */
export type SocialWebShare = 'article' | 'note' | 'none';

export const SOCIAL_WEB_SHARE_OPTIONS: ReadonlyArray<{
  value: SocialWebShare;
  label: string;
  hint: string;
}> = [
  {
    value: 'article',
    label: 'Full article',
    hint: 'The whole post can be read on the social web.',
  },
  { value: 'note', label: 'Short note', hint: 'A short note with a link to the post.' },
  { value: 'none', label: 'Don’t share', hint: 'The post isn’t shared on the social web.' },
];

export const DEFAULT_SOCIAL_WEB_SHARE: SocialWebShare = 'article';

export function isSocialWebShare(value: unknown): value is SocialWebShare {
  return value === 'article' || value === 'note' || value === 'none';
}

export function socialWebShareLabel(value: SocialWebShare): string {
  return SOCIAL_WEB_SHARE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * The longest a note on the social web can be. Matches the limit used by
 * the ActivityPub service when it builds a note from a post.
 */
export const SOCIAL_WEB_NOTE_MAX_LENGTH = 500;

/** Characters in a string, counting emoji and other astral characters once */
export function characterCount(text: string): number {
  return Array.from(text).length;
}

/**
 * How many characters of custom note text fit in front of the link to the
 * post (separated from it by a blank line).
 */
export function socialWebNoteTextLimit(postUrl: string | null | undefined): number {
  const linkLength = postUrl ? characterCount(postUrl) + 2 : 0;
  return Math.max(0, SOCIAL_WEB_NOTE_MAX_LENGTH - linkLength);
}
