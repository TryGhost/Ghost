import type { Episode, Podcast } from './podcasts-store';

/**
 * The Lexical document for a new post that opens with the episode's podcast
 * card already in place, followed by an empty paragraph to write in. The
 * node shape mirrors `PodcastNode.exportJSON()` in kg-default-nodes.
 */
export function buildEpisodePostLexical(podcast: Podcast, episode: Episode): string {
  return JSON.stringify({
    root: {
      children: [
        {
          type: 'podcast',
          version: 1,
          podcastId: podcast.id,
          episodeId: episode.id,
          podcastTitle: podcast.title,
          title: episode.title,
          description: episode.description,
          episodeUrl: episode.audioUrl,
          duration: episode.duration,
          artworkUrl: episode.artworkUrl || podcast.artworkUrl || '',
        },
        {
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });
}

export function buildEpisodePostPayload(podcast: Podcast, episode: Episode) {
  return {
    title: episode.title,
    lexical: buildEpisodePostLexical(podcast, episode),
  };
}
