// Kept apart from the schema so the root entry point, which runs without zod, can use it.

type LoadedSurface =
  | { type: 'admin_page'; url: string }
  | { type: 'card'; render: string; settings?: string; frame?: string };

/** Every URL in a surface that Ghost loads. */
export function surfaceUrls(surface: LoadedSurface): string[] {
  if (surface.type === 'admin_page') {
    return [surface.url];
  }
  return [surface.render, surface.settings, surface.frame].filter(
    (url): url is string => url !== undefined,
  );
}
