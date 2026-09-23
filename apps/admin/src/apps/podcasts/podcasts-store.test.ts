import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  createEpisode,
  createPodcast,
  deleteEpisode,
  deletePodcast,
  getEpisode,
  getEpisodes,
  getPodcast,
  getPodcasts,
  resetPodcastsStore,
  updateEpisode,
  updatePodcast,
  useEpisodes,
  usePodcasts,
} from './podcasts-store';

const podcastInput = {
  title: 'The Daily Awesome',
  description: 'A show about awesome things',
  author: 'Jamie',
  website: 'https://example.com',
  artworkUrl: '',
};

const episodeInput = {
  title: 'Episode 1',
  description: 'The first one',
  audioUrl: 'https://example.com/1.mp3',
  duration: '42:10',
  status: 'draft' as const,
  publishedAt: '',
};

describe('podcasts store', () => {
  beforeEach(() => {
    resetPodcastsStore();
  });

  it('starts empty', () => {
    expect(getPodcasts()).toEqual([]);
  });

  it('creates, updates and deletes podcasts', () => {
    const podcast = createPodcast(podcastInput);
    expect(getPodcast(podcast.id)?.title).toBe('The Daily Awesome');

    updatePodcast(podcast.id, { ...podcastInput, title: 'Renamed' });
    expect(getPodcast(podcast.id)?.title).toBe('Renamed');

    deletePodcast(podcast.id);
    expect(getPodcast(podcast.id)).toBeUndefined();
  });

  it('creates, updates and deletes episodes for a podcast', () => {
    const podcast = createPodcast(podcastInput);
    const episode = createEpisode(podcast.id, episodeInput);
    expect(getEpisodes(podcast.id)).toHaveLength(1);

    updateEpisode(episode.id, { ...episodeInput, status: 'published', publishedAt: '2026-09-22' });
    expect(getEpisode(episode.id)?.status).toBe('published');

    deleteEpisode(episode.id);
    expect(getEpisodes(podcast.id)).toHaveLength(0);
  });

  it('deleting a podcast removes its episodes', () => {
    const podcast = createPodcast(podcastInput);
    const other = createPodcast({ ...podcastInput, title: 'Other' });
    createEpisode(podcast.id, episodeInput);
    createEpisode(other.id, episodeInput);

    deletePodcast(podcast.id);

    expect(getEpisodes(podcast.id)).toHaveLength(0);
    expect(getEpisodes(other.id)).toHaveLength(1);
  });

  it('persists to localStorage and ignores malformed data', () => {
    createPodcast(podcastInput);
    expect(window.localStorage.getItem('ghost-admin:apps:podcasts')).toContain('The Daily Awesome');

    resetPodcastsStore();
    window.localStorage.setItem('ghost-admin:apps:podcasts', '{"podcasts": "nope"}');
    expect(getPodcasts()).toEqual([]);
  });

  it('notifies hook consumers', () => {
    const podcasts = renderHook(() => usePodcasts());
    expect(podcasts.result.current).toHaveLength(0);

    let id = '';
    act(() => {
      id = createPodcast(podcastInput).id;
    });
    expect(podcasts.result.current).toHaveLength(1);

    const episodes = renderHook(() => useEpisodes(id));
    act(() => {
      createEpisode(id, episodeInput);
    });
    expect(episodes.result.current).toHaveLength(1);
  });
});
