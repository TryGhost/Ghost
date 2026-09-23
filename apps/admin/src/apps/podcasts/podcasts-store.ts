import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Stub data layer for the Podcasts app. Podcasts and their episodes live in
// localStorage behind a tiny external store until the app has an API.
const STORAGE_KEY = 'ghost-admin:apps:podcasts';

export interface Podcast {
  id: string;
  title: string;
  description: string;
  author: string;
  website: string;
  artworkUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type EpisodeStatus = 'draft' | 'published';

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  audioUrl: string;
  /** Free-form, e.g. "42:10". */
  duration: string;
  status: EpisodeStatus;
  /** ISO date (YYYY-MM-DD) or empty. */
  publishedAt: string;
  artworkUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type PodcastInput = Pick<
  Podcast,
  'title' | 'description' | 'author' | 'website' | 'artworkUrl'
>;
export type EpisodeInput = Pick<
  Episode,
  'title' | 'description' | 'audioUrl' | 'duration' | 'status' | 'publishedAt'
> &
  Partial<Pick<Episode, 'artworkUrl'>>;

interface PodcastsState {
  podcasts: Podcast[];
  episodes: Episode[];
}

const EMPTY_STATE: PodcastsState = { podcasts: [], episodes: [] };

const listeners = new Set<() => void>();
let snapshot: PodcastsState | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStorage(): PodcastsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!isRecord(parsed) || !Array.isArray(parsed.podcasts) || !Array.isArray(parsed.episodes)) {
      return EMPTY_STATE;
    }
    return {
      podcasts: parsed.podcasts as Podcast[],
      episodes: (parsed.episodes as Partial<Episode>[]).map(
        (episode) => ({ artworkUrl: '', ...episode }) as Episode,
      ),
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeStorage(state: PodcastsState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable; in-memory state still works.
  }
}

function getSnapshot(): PodcastsState {
  snapshot ??= readStorage();
  return snapshot;
}

function setSnapshot(state: PodcastsState) {
  snapshot = state;
  writeStorage(state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function getPodcasts(): Podcast[] {
  return getSnapshot().podcasts;
}

export function getPodcast(id: string | undefined): Podcast | undefined {
  return getSnapshot().podcasts.find((podcast) => podcast.id === id);
}

export function getEpisodes(podcastId: string | undefined): Episode[] {
  return getSnapshot().episodes.filter((episode) => episode.podcastId === podcastId);
}

export function getEpisode(id: string | undefined): Episode | undefined {
  return getSnapshot().episodes.find((episode) => episode.id === id);
}

export function createPodcast(input: PodcastInput): Podcast {
  const timestamp = now();
  const podcast: Podcast = { id: newId(), ...input, createdAt: timestamp, updatedAt: timestamp };
  const state = getSnapshot();
  setSnapshot({ ...state, podcasts: [...state.podcasts, podcast] });
  return podcast;
}

export function updatePodcast(id: string, input: PodcastInput): Podcast | undefined {
  const state = getSnapshot();
  let updated: Podcast | undefined;
  const podcasts = state.podcasts.map((podcast) => {
    if (podcast.id !== id) {
      return podcast;
    }
    updated = { ...podcast, ...input, updatedAt: now() };
    return updated;
  });
  if (updated) {
    setSnapshot({ ...state, podcasts });
  }
  return updated;
}

/** Deletes the podcast and every episode that belongs to it. */
export function deletePodcast(id: string) {
  const state = getSnapshot();
  setSnapshot({
    podcasts: state.podcasts.filter((podcast) => podcast.id !== id),
    episodes: state.episodes.filter((episode) => episode.podcastId !== id),
  });
}

export function createEpisode(podcastId: string, input: EpisodeInput): Episode {
  const timestamp = now();
  const episode: Episode = {
    id: newId(),
    podcastId,
    artworkUrl: '',
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const state = getSnapshot();
  setSnapshot({ ...state, episodes: [...state.episodes, episode] });
  return episode;
}

export function updateEpisode(id: string, input: EpisodeInput): Episode | undefined {
  const state = getSnapshot();
  let updated: Episode | undefined;
  const episodes = state.episodes.map((episode) => {
    if (episode.id !== id) {
      return episode;
    }
    updated = { ...episode, ...input, updatedAt: now() };
    return updated;
  });
  if (updated) {
    setSnapshot({ ...state, episodes });
  }
  return updated;
}

export function deleteEpisode(id: string) {
  const state = getSnapshot();
  setSnapshot({ ...state, episodes: state.episodes.filter((episode) => episode.id !== id) });
}

/** Test-only: forget in-memory and stored podcasts. */
export function resetPodcastsStore() {
  snapshot = undefined;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

function usePodcastsState(): PodcastsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePodcasts(): Podcast[] {
  return usePodcastsState().podcasts;
}

export function usePodcast(id: string | undefined): Podcast | undefined {
  const { podcasts } = usePodcastsState();
  return useMemo(() => podcasts.find((podcast) => podcast.id === id), [podcasts, id]);
}

export function useEpisodes(podcastId: string | undefined): Episode[] {
  const { episodes } = usePodcastsState();
  return useMemo(
    () => episodes.filter((episode) => episode.podcastId === podcastId),
    [episodes, podcastId],
  );
}

export function useEpisode(id: string | undefined): Episode | undefined {
  const { episodes } = usePodcastsState();
  return useMemo(() => episodes.find((episode) => episode.id === id), [episodes, id]);
}

export function useEpisodeCounts(): Record<string, number> {
  const { episodes } = usePodcastsState();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    episodes.forEach((episode) => {
      counts[episode.podcastId] = (counts[episode.podcastId] ?? 0) + 1;
    });
    return counts;
  }, [episodes]);
}

/** Podcasts with their episodes nested, for consumers such as the editor's card config. */
export interface PodcastWithEpisodes extends Podcast {
  episodes: Episode[];
}

export function usePodcastsWithEpisodes(): PodcastWithEpisodes[] {
  const { podcasts, episodes } = usePodcastsState();
  return useMemo(
    () =>
      podcasts.map((podcast) => ({
        ...podcast,
        episodes: episodes.filter((episode) => episode.podcastId === podcast.id),
      })),
    [podcasts, episodes],
  );
}

export function usePodcastActions() {
  return useMemo(
    () => ({
      createPodcast,
      updatePodcast,
      deletePodcast,
      createEpisode,
      updateEpisode,
      deleteEpisode,
    }),
    [],
  );
}

export function useRefreshPodcasts() {
  return useCallback(() => listeners.forEach((listener) => listener()), []);
}
