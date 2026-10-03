import { applyThemeLiteralTextEdit } from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';
import type { PreviewInlineTextDraft } from '@/builder/workspaces/theme/preview/preview-document';

export type CanvasTextDraft = PreviewInlineTextDraft & {
  frameId: string;
  kind: 'device' | 'expanded';
  baseRevision: string;
  sourceFile: string;
  detached: boolean;
  conflict: boolean;
  captureFailed?: boolean;
};

// Use the existing literal validator/editor to identify the authored node. This
// keeps comments, dynamic output and ambiguous source positions out of recovery.
function identity(source: string, markerValue: string, tagName: string): string | null {
  const marker = parseEditMarker(markerValue);
  if (!marker) {
    return null;
  }
  let token = 'ghost_canvas_retained_text_anchor';
  while (source.includes(token)) {
    token += '_';
  }
  try {
    const changed = applyThemeLiteralTextEdit({ [marker.file]: source }, marker, token, {
      tagName,
    })[marker.file];
    const start =
      source
        .split('\n')
        .slice(0, marker.line - 1)
        .reduce((offset, line) => offset + line.length + 1, 0) +
      marker.column -
      1;
    const end = source.length - (changed.length - changed.indexOf(token) - token.length);
    return source.slice(start, end);
  } catch {
    return null;
  }
}

export function resolveCanvasTextDraft(
  draft: CanvasTextDraft,
  files: Record<string, string>,
  targets: Record<string, string>,
): string | null {
  const original = parseEditMarker(draft.marker);
  const source = original ? files[original.file] : undefined;
  if (!original || source === undefined) {
    return null;
  }
  if (source === draft.sourceFile) {
    return targets[draft.marker] === draft.tagName ? draft.marker : null;
  }
  const expected = identity(draft.sourceFile, draft.marker, draft.tagName);
  if (expected === null) {
    return null;
  }
  const matches = Object.entries(targets).filter(
    ([marker, tagName]) =>
      tagName === draft.tagName &&
      parseEditMarker(marker)?.file === original.file &&
      identity(source, marker, tagName) === expected,
  );
  return matches.length === 1 ? matches[0][0] : null;
}
