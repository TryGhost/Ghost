import type {
  IframePreviewDocumentSurface,
  PreviewLayout,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { ScreenshotResult } from '@/builder/workspaces/theme/preview/screenshot';

// Provisional experiment budgets. Existing per-image screenshot limits still apply.
export const OVERVIEW_CAPTURE_LIMITS = {
  tileHeight: 2_048,
  maxTiles: 8,
  maxPixels: 32 * 1024 * 1024,
  maxCharacters: 12 * 1024 * 1024,
} as const;

export type CapturedOverview = {
  frameId: string;
  revision: string;
  documentId: string;
  artifactId: string;
  viewport: PreviewLayout['viewport'];
  documentHeight: number;
  coveredHeight: number;
  complete: boolean;
  tiles: (ScreenshotResult & { y: number })[];
  warnings: string[];
};

type CaptureSurface = Pick<IframePreviewDocumentSurface, 'measureLayout' | 'screenshot'>;

function assertActive(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function sameLayout(first: PreviewLayout, next: PreviewLayout) {
  return (
    first.documentId === next.documentId &&
    first.viewport.width === next.viewport.width &&
    first.viewport.height === next.viewport.height &&
    first.viewport.scrollX === next.viewport.scrollX &&
    first.viewport.scrollY === next.viewport.scrollY &&
    first.document.width === next.document.width &&
    first.document.height === next.document.height
  );
}

/** Captures one caller-owned document. Caller must abort on replacement or binding change. */
export async function captureOverview(
  surface: CaptureSurface,
  frameId: string,
  revision: string,
  signal: AbortSignal,
): Promise<CapturedOverview> {
  assertActive(signal);
  const layout = await surface.measureLayout(signal);
  const tiles: CapturedOverview['tiles'] = [];
  const warnings = new Set<string>();
  let coveredHeight = 0;
  let characters = 0;
  let pixels = 0;
  while (
    coveredHeight < layout.document.height &&
    tiles.length < OVERVIEW_CAPTURE_LIMITS.maxTiles
  ) {
    assertActive(signal);
    const height = Math.min(
      OVERVIEW_CAPTURE_LIMITS.tileHeight,
      layout.document.height - coveredHeight,
    );
    if (
      characters >= OVERVIEW_CAPTURE_LIMITS.maxCharacters ||
      pixels + layout.viewport.width * height > OVERVIEW_CAPTURE_LIMITS.maxPixels
    ) {
      warnings.add('The composition capture reached its aggregate output budget.');
      break;
    }
    const tile = await surface.screenshot(
      { kind: 'region', x: 0, y: coveredHeight, width: layout.viewport.width, height },
      signal,
    );
    assertActive(signal);
    if (!sameLayout(layout, await surface.measureLayout(signal))) {
      throw new Error(
        'The backing layout changed during composition capture. Retry the current document.',
      );
    }
    assertActive(signal);
    if (tile.width !== layout.viewport.width || tile.height !== height) {
      throw new Error('The captured region dimensions changed.');
    }
    if (characters + tile.dataUrl.length > OVERVIEW_CAPTURE_LIMITS.maxCharacters) {
      warnings.add('The composition capture reached its aggregate output budget.');
      break;
    }
    characters += tile.dataUrl.length;
    pixels += tile.width * tile.height;
    tiles.push({ ...tile, y: coveredHeight });
    tile.warnings.forEach((warning) => warnings.add(warning));
    coveredHeight += height;
  }
  if (!sameLayout(layout, await surface.measureLayout(signal))) {
    throw new Error(
      'The backing layout changed during composition capture. Retry the current document.',
    );
  }
  assertActive(signal);
  if (coveredHeight < layout.document.height) {
    warnings.add(
      `${layout.document.height - coveredHeight} CSS pixels below the captured region were not captured.`,
    );
  }
  if (layout.document.width > layout.viewport.width) {
    warnings.add('Horizontal overflow outside the configured device width was not captured.');
  }
  return {
    frameId,
    revision,
    documentId: layout.documentId,
    artifactId: crypto.randomUUID(),
    viewport: layout.viewport,
    documentHeight: layout.document.height,
    coveredHeight,
    complete:
      coveredHeight === layout.document.height && layout.document.width <= layout.viewport.width,
    tiles,
    warnings: [...warnings],
  };
}
