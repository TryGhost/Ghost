import type { AccessDecision } from './ghost-client.ts';

export type MediaFormat = 'audio' | 'video';
export interface Media {
  url: string;
  mime_type: string;
  byte_length: number;
  variant: 'full' | 'free';
}
export interface Post {
  id: string;
  uuid: string;
  title: string;
  url: string;
  status: string;
  published_at: string;
  card_revision: string;
  custom_excerpt: string | null;
  lexical: string | null;
}
export interface Episode {
  post: Post;
  cardId: string;
  showId: string;
  title: string;
  props: Record<string, unknown>;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Traverse only actual Lexical children, never arbitrary objects inside props. */
export function extractEpisodes(post: Post): Episode[] {
  if (post.status !== 'published' || !post.lexical) {
    return [];
  }
  let document;
  try {
    document = JSON.parse(post.lexical);
  } catch {
    return [];
  }
  const nodes: Record<string, unknown>[] = [];
  const pending: unknown[] = [document?.root];
  while (pending.length) {
    const node = pending.pop();
    if (!record(node)) {
      continue;
    }
    if (node.type === 'addon') {
      nodes.push(node);
    }
    if (Array.isArray(node.children)) {
      for (let index = node.children.length - 1; index >= 0; index--) {
        pending.push(node.children[index]);
      }
    }
  }
  const counts = new Map<unknown, number>();
  for (const node of nodes) {
    counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
  }
  return nodes.flatMap((node) => {
    if (
      node.addonHandle !== 'podcast' ||
      node.blockName !== 'episode' ||
      typeof node.id !== 'string' ||
      !node.id.isWellFormed() ||
      !node.id.trim() ||
      node.id.length > 256 ||
      counts.get(node.id) !== 1 ||
      !record(node.props)
    ) {
      return [];
    }
    const props = node.props;
    if (
      props.version !== 1 ||
      typeof props.show_id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(props.show_id)
    ) {
      return [];
    }
    return [
      {
        post,
        cardId: node.id,
        showId: props.show_id,
        title:
          typeof props.title === 'string' && props.title.trim() ? props.title.trim() : post.title,
        props,
      },
    ];
  });
}

/** Bind media to the same saved content/access snapshot used by Ghost gating. */
export function episodeAccess(episode: Episode, decision: AccessDecision | undefined) {
  if (
    !decision ||
    !episode.post.card_revision ||
    episode.post.card_revision !== decision.card_revision
  ) {
    throw new Error('Post revision changed.');
  }
  return { access: decision.access, visible: decision.visible_card_ids.includes(episode.cardId) };
}

/** Shared by player and feeds; placement is checked before choosing any media. */
export function selectMedia(
  props: Record<string, unknown>,
  format: MediaFormat,
  decision: { access: boolean; visible: boolean },
): Media | null {
  if (!decision.visible) {
    return null;
  }
  for (const variant of ['full', 'free'] as const) {
    if (variant === 'full' ? !decision.access : props.offer_free !== true) {
      continue;
    }
    const slot = props[`${variant}_${format}`];
    if (
      !record(slot) ||
      typeof slot.url !== 'string' ||
      typeof slot.mime_type !== 'string' ||
      !new RegExp(`^${format}/[a-zA-Z0-9!#$&^_.+-]+$`).test(slot.mime_type) ||
      typeof slot.byte_length !== 'number' ||
      !Number.isSafeInteger(slot.byte_length) ||
      slot.byte_length < 0
    ) {
      continue;
    }
    try {
      const url = new URL(slot.url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        continue;
      }
    } catch {
      continue;
    }
    return { url: slot.url, mime_type: slot.mime_type, byte_length: slot.byte_length, variant };
  }
  return null;
}
