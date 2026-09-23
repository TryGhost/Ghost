export const MEDIA_SLOTS = ['full_audio', 'free_audio', 'full_video', 'free_video'] as const;
export type MediaSlot = (typeof MEDIA_SLOTS)[number];
export interface Show {
  id: string;
  title: string;
  description: string;
  artwork: string;
  author: string;
  language: string;
  explicit: boolean;
}
export interface Configuration {
  shows: Show[];
}

export function parseConfiguration(input: unknown): Configuration {
  if (!input || typeof input !== 'object' || !('shows' in input)) {
    return { shows: [] };
  }
  const shows = (input as Configuration).shows;
  if (!Array.isArray(shows) || shows.length > 100) {
    throw new Error('Configure up to 100 shows.');
  }
  const ids = new Set<string>();
  return {
    shows: shows.map((show) => {
      if (
        !show ||
        typeof show.id !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(show.id) ||
        ids.has(show.id)
      ) {
        throw new Error('Each show needs a unique stable ID.');
      }
      ids.add(show.id);
      for (const key of ['title', 'description', 'artwork', 'author', 'language'] as const) {
        if (
          typeof show[key] !== 'string' ||
          show[key].length > (key === 'description' ? 5000 : 2000)
        ) {
          throw new Error(`Invalid show ${key}.`);
        }
      }
      if (!show.title.trim()) {
        throw new Error('Give each show a title.');
      }
      if (show.artwork && !/^https?:$/.test(new URL(show.artwork).protocol)) {
        throw new Error('Artwork needs an HTTP or HTTPS URL.');
      }
      if (typeof show.explicit !== 'boolean') {
        throw new Error('Choose whether the show contains explicit content.');
      }
      return { ...show, title: show.title.trim() };
    }),
  };
}
