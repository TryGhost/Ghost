import type { GhostClient, MemberCredential } from './ghost-client.ts';
import { extractEpisodes, selectMedia } from './selection.ts';

export interface PlayerRequest {
  post_id: string;
  card_id: string;
  member?: MemberCredential | null;
}

export async function player(
  ghost: Pick<GhostClient, 'configuration' | 'post' | 'access'>,
  input: PlayerRequest,
) {
  const [configuration, post, decisions] = await Promise.all([
    ghost.configuration(),
    ghost.post(input.post_id),
    ghost.access([input.post_id], input.member),
  ]);
  const decision = decisions.get(input.post_id);
  if (!decision) {
    throw new Error('Missing access decision.');
  }
  const episode =
    post?.id === input.post_id
      ? extractEpisodes(post).find((item) => item.cardId === input.card_id)
      : undefined;
  if (!episode) {
    return { state: 'missing' } as const;
  }
  if (!post?.card_revision || post.card_revision !== decision.card_revision) {
    throw new Error('Post revision changed.');
  }
  if (!decision.visible_card_ids.includes(episode.cardId)) {
    return { state: 'hidden' } as const;
  }
  const show = configuration.shows.find((item) => item.id === episode.showId);
  if (!show) {
    return { state: 'missing' } as const;
  }
  const selection = { access: decision.access, visible: true };
  const media = {
    audio: selectMedia(episode.props, 'audio', selection),
    video: selectMedia(episode.props, 'video', selection),
  };
  return {
    state: media.audio || media.video ? ('ready' as const) : ('shell' as const),
    episode: { post_id: post!.id, card_id: episode.cardId, title: episode.title },
    show: { id: show.id, title: show.title },
    media,
  };
}
