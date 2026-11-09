// Kept apart from the schema so the root entry point, which runs without zod, can use it.

type LoadedSurface =
  | { type: 'admin_page'; url: string }
  | {
      type: 'card';
      render: string;
      settings?: string;
      frame?: string;
      backend_origins?: string[];
      image_origins?: string[];
      media_origins?: string[];
    };

/** Every URL and origin in a surface that Ghost or a reader's browser loads from. */
export function surfaceUrls(surface: LoadedSurface): string[] {
  if (surface.type === 'admin_page') {
    return [surface.url];
  }
  return [
    surface.render,
    surface.settings,
    surface.frame,
    ...(surface.backend_origins ?? []),
    ...(surface.image_origins ?? []),
    ...(surface.media_origins ?? []),
  ].filter((url): url is string => url !== undefined);
}
