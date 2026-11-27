import type atlasData from './map-data/world-states.json';

export type MapAtlas = typeof atlasData;

let loadedAtlas: MapAtlas | null = null;
let atlasRequest: Promise<MapAtlas> | null = null;

/** The atlas once it has loaded, so later maps can render it on their first frame. */
export function getLoadedMapAtlas(): MapAtlas | null {
  return loadedAtlas;
}

export function loadMapAtlas(): Promise<MapAtlas> {
  atlasRequest ??= import('./map-data/world-states.json').then(
    (module) => {
      loadedAtlas = module.default;
      return loadedAtlas;
    },
    (error: unknown) => {
      atlasRequest = null;
      throw error;
    },
  );
  return atlasRequest;
}

/** Fetches the atlas ahead of a member's page; geometry is decorative, so failures are dropped. */
export function preloadMapAtlas(): void {
  loadMapAtlas().catch(() => undefined);
}
