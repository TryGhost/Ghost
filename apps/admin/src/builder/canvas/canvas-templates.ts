import type { CanvasContentKind, CanvasPost } from './canvas-driver';

export function isCanvasTemplatePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 256 &&
    !value.includes('\0') &&
    /^[^/\\]+\.hbs$/.test(value)
  );
}

export type CanvasTemplateChoice = { path: string; items: CanvasPost[] };

export function canvasErrorTemplate(files: Record<string, string>): string | null {
  return (
    ['error-404.hbs', 'error-4xx.hbs', 'error.hbs'].find((path) => Object.hasOwn(files, path)) ??
    null
  );
}

/** Two path segments deliberately fall outside the supported /{slug}/ routing. */
export function canvasErrorRoute(siteUrl: string): string {
  return new URL('__ghost_canvas__/not-found/', `${siteUrl.replace(/\/$/, '')}/`).href;
}

/** Default Ghost hierarchy: slug > assigned custom > kind > entry/index fallback.
 * This describes eligible published routes; it never overrides the renderer. */
export function canvasTemplate(
  files: Record<string, string>,
  kind: CanvasContentKind,
  item: CanvasPost,
): string | null {
  const entry = kind === 'post' || kind === 'page';
  const candidates = [
    ...(item.slug ? [`${kind}-${item.slug}`] : []),
    ...(entry && item.customTemplate ? [item.customTemplate] : []),
    kind,
    entry ? 'post' : 'index',
  ];
  return candidates.map((name) => `${name}.hbs`).find((path) => Object.hasOwn(files, path)) ?? null;
}

export function canvasTemplates(
  files: Record<string, string>,
  kind: CanvasContentKind,
  items: CanvasPost[],
): CanvasTemplateChoice[] {
  const entry = kind === 'post' || kind === 'page';
  return Object.keys(files)
    .filter(
      (path) =>
        !path.includes('/') &&
        path.endsWith('.hbs') &&
        (path === `${kind}.hbs` ||
          path.startsWith(`${kind}-`) ||
          (entry ? path.startsWith('custom-') || path === 'post.hbs' : path === 'index.hbs')),
    )
    .sort()
    .map((path) => ({
      path,
      items: items.filter((item) => canvasTemplate(files, kind, item) === path),
    }));
}
