import type { GhostClient, MemberCredential } from './ghost-client.ts';
import { episodeAccess, extractEpisodes, selectMedia } from './selection.ts';
import { feedLinks } from './feeds.ts';

export interface PlayerRequest {
  post_id: string;
  card_id: string;
  member?: MemberCredential | null;
}

export async function player(
  ghost: Pick<GhostClient, 'configuration' | 'post' | 'access'>,
  input: PlayerRequest,
  providerUrl: string,
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
  const selection = episodeAccess(episode, decision);
  if (!selection.visible) {
    return { state: 'hidden' } as const;
  }
  const show = configuration.shows.find((item) => item.id === episode.showId);
  if (!show) {
    return { state: 'missing' } as const;
  }
  const media = {
    audio: selectMedia(episode.props, 'audio', selection),
    video: selectMedia(episode.props, 'video', selection),
  };
  return {
    state: media.audio || media.video ? ('ready' as const) : ('shell' as const),
    episode: { post_id: post!.id, card_id: episode.cardId, title: episode.title },
    show: { id: show.id, title: show.title },
    media,
    feeds: feedLinks(providerUrl, show.id, input.member),
  };
}
