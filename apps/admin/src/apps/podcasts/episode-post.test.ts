import { describe, expect, it } from 'vitest';
import { buildEpisodePostLexical, buildEpisodePostPayload } from './episode-post';
import type { Episode, Podcast } from './podcasts-store';

interface LexicalDoc {
  root: { type: string; children: Record<string, unknown>[] };
}

const parse = (lexical: string) => JSON.parse(lexical) as LexicalDoc;

const podcast: Podcast = {
  id: 'p1',
  title: 'The Daily Awesome',
  description: '',
  author: '',
  website: '',
  artworkUrl: 'https://example.com/show.jpg',
  createdAt: '',
  updatedAt: '',
};

const episode: Episode = {
  id: 'e1',
  podcastId: 'p1',
  title: 'Episode 1',
  description: 'The first one',
  audioUrl: 'https://example.com/1.mp3',
  duration: '42:10',
  status: 'draft',
  publishedAt: '',
  artworkUrl: '',
  createdAt: '',
  updatedAt: '',
};

describe('buildEpisodePostLexical', () => {
  it('opens with the podcast card followed by an empty paragraph', () => {
    const doc = parse(buildEpisodePostLexical(podcast, episode));

    expect(doc.root.type).toBe('root');
    expect(doc.root.children).toHaveLength(2);
    expect(doc.root.children[0]).toEqual({
      type: 'podcast',
      version: 1,
      podcastId: 'p1',
      episodeId: 'e1',
      podcastTitle: 'The Daily Awesome',
      title: 'Episode 1',
      description: 'The first one',
      episodeUrl: 'https://example.com/1.mp3',
      duration: '42:10',
      artworkUrl: 'https://example.com/show.jpg',
    });
    expect(doc.root.children[1].type).toBe('paragraph');
  });

  it('prefers the episode artwork over the podcast artwork', () => {
    const doc = parse(
      buildEpisodePostLexical(podcast, { ...episode, artworkUrl: 'https://example.com/ep.jpg' }),
    );
    expect(doc.root.children[0].artworkUrl).toBe('https://example.com/ep.jpg');
  });
});

describe('buildEpisodePostPayload', () => {
  it('titles the post after the episode', () => {
    const payload = buildEpisodePostPayload(podcast, episode);
    expect(payload.title).toBe('Episode 1');
    expect(parse(payload.lexical).root.children[0].episodeId).toBe('e1');
  });
});
