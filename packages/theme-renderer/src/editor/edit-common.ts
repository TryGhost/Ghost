/**
 * Shared internals of the anchored edit appliers (text-edit.ts +
 * attribute-edit.ts) — NOT exported from the package; the public surface is
 * src/editor/index.ts.
 *
 * Both appliers resolve a marker position (docs/markers.md — the 1-based
 * position of an element's `<` in the ORIGINAL theme source) to an open tag
 * with identical safety rules:
 *
 * - positions are resolved against scanner-yielded tags only (the shared
 *   source scanner, src/engine/source-scanner.ts), so an edit can never accept
 *   a position the marker transform would not have produced;
 * - anchor verification: when the caller passes the clicked element's tag
 *   name, the edit only applies if `<tagname` is actually at the marker
 *   position; on a mismatch a bounded re-locate looks for the anchored tag
 *   within ±RELOCATE_LINES lines and uses it only when it is the UNIQUE
 *   candidate — anything ambiguous (and any position outside the file) fails
 *   loudly as a stale marker rather than editing the wrong element;
 * - dynamic tag names and unterminated open tags are refused via the scanner.
 */
import errors from '@tryghost/errors';
import {
  openTagEnd,
  openTagNameAt,
  scanSourceTags,
  type OpenTagEnd,
} from '../engine/source-scanner.ts';
import type { EditMarker } from '../engine/markers.ts';
import type { ThemeFiles } from '../theme/theme-source.ts';

export interface SourcePosition {
  /** 1-based line of the element's `<` in the original source */
  line: number;
  /** 1-based column of the element's `<` in the original source */
  column: number;
}

export interface EditAnchor {
  /**
   * Expected tag name of the element at the marker position
   * (case-insensitive — pass the clicked DOM element's `tagName` directly).
   */
  tagName: string;
}

/** How far (in lines, each direction) a stale anchored marker may re-locate. */
export const RELOCATE_LINES = 3;

/** Offsets at which each 1-based line starts. */
export function lineStartOffsets(source: string): number[] {
  const offsets = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10 /* \n */) {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/** Absolute offset of a 1-based position, or null when outside the source. */
export function offsetAt(
  source: string,
  lineStarts: number[],
  position: SourcePosition,
): number | null {
  if (position.line < 1 || position.line > lineStarts.length || position.column < 1) {
    return null;
  }
  const start = lineStarts[position.line - 1]!;
  const end = position.line < lineStarts.length ? lineStarts[position.line]! : source.length;
  const offset = start + position.column - 1;
  return offset < end ? offset : null;
}

/**
 * Anchor-verified offset resolution: exact position when the anchored tag is
 * there; otherwise a bounded re-locate (±RELOCATE_LINES) that only succeeds on
 * a UNIQUE candidate. Both paths accept only scanner-yielded tags — markable
 * static open tags the marker transform would have marked — so a stale marker
 * can never re-locate into an HTML/hbs comment, a rawtext element body, or a
 * dynamic tag. Everything else is a stale marker and throws.
 */
export function resolveAnchoredOffset(
  source: string,
  lineStarts: number[],
  position: SourcePosition,
  anchor: EditAnchor,
  offset: number | null,
): number {
  const want = anchor.tagName.toLowerCase();
  const staleError = (detail: string): Error =>
    new errors.IncorrectUsageError({
      message: `stale marker: expected an <${want}> open tag at ${position.line}:${position.column}${detail}`,
    });

  if (position.line < 1 || position.line > lineStarts.length) {
    // a line outside the file belongs to a different revision of it —
    // refuse instead of re-locating within a clamped window
    throw staleError(` — line ${position.line} is outside the file (${lineStarts.length} lines)`);
  }

  const fromLine = Math.max(1, position.line - RELOCATE_LINES);
  const toLine = Math.min(lineStarts.length, position.line + RELOCATE_LINES);
  const from = lineStarts[fromLine - 1]!;
  const to = toLine < lineStarts.length ? lineStarts[toLine]! : source.length;

  const candidates: number[] = [];
  for (const tag of scanSourceTags(source)) {
    if (tag.start >= to) {
      break;
    }
    if (!tag.markable || !tag.closed || tag.tagName.toLowerCase() !== want) {
      continue;
    }
    if (offset !== null && tag.start === offset) {
      // the anchored tag is exactly at the marker position — fresh marker
      return offset;
    }
    if (tag.start >= from) {
      candidates.push(tag.start);
    }
  }
  if (candidates.length === 1) {
    return candidates[0]!;
  }
  throw staleError(
    candidates.length === 0
      ? `, and none found within ±${RELOCATE_LINES} lines`
      : `, and ${candidates.length} candidates found within ±${RELOCATE_LINES} lines — cannot re-locate safely`,
  );
}

export interface ResolvedOpenTag {
  /** Absolute offset of the tag's `<` (post anchor resolution) */
  offset: number;
  /** The tag name, lowercased */
  tagName: string;
  /** Offset just past the tag name — the marker-consistent insertion point */
  nameEnd: number;
  /** The quote/mustache-aware end of the open tag (always `closed`) */
  tagEnd: OpenTagEnd;
}

/**
 * The full shared resolution path: position (+ optional anchor) → a markable,
 * terminated open tag. Throws IncorrectUsageError for everything an applier
 * must refuse: positions outside the source, positions not at a static open
 * tag (dynamic tag names included), stale anchors, unterminated tags.
 */
export function resolveMarkedOpenTag(
  source: string,
  position: SourcePosition,
  anchor?: EditAnchor,
): ResolvedOpenTag {
  const lineStarts = lineStartOffsets(source);
  const at = `${position.line}:${position.column}`;

  let offset = offsetAt(source, lineStarts, position);
  if (anchor) {
    offset = resolveAnchoredOffset(source, lineStarts, position, anchor, offset);
  } else if (offset === null) {
    throw new errors.IncorrectUsageError({ message: `position ${at} is outside the source` });
  }

  const tag = openTagNameAt(source, offset);
  if (!tag || !tag.markable) {
    throw new errors.IncorrectUsageError({
      message: `position ${at} does not point at an element open tag`,
    });
  }
  const tagName = tag.tagName.toLowerCase();

  const tagEnd = openTagEnd(source, tag.nameEnd);
  if (!tagEnd.closed) {
    throw new errors.IncorrectUsageError({
      message: `unterminated open tag <${tagName}> at ${at}`,
    });
  }

  return { offset, tagName, nameEnd: tag.nameEnd, tagEnd };
}

/**
 * ThemeFiles-level wrapper shared by both appliers: looks up `marker.file`,
 * applies `editFile` to its source, and returns a NEW files object of the
 * same shape (the input is never mutated) — feed it to a fresh
 * `createRenderer` and re-render (docs/markers.md §editor loop).
 */
export function editThemeFile<T extends ThemeFiles>(
  theme: T,
  marker: EditMarker,
  editFile: (source: string) => string,
): T {
  if (theme instanceof Map) {
    const source = theme.get(marker.file);
    if (source === undefined) {
      throw new errors.IncorrectUsageError({
        message: `no theme file '${marker.file}' — the marker does not match this theme`,
      });
    }
    const next = new Map(theme);
    next.set(marker.file, editFile(source));
    return next as T;
  }
  const source = theme[marker.file];
  if (typeof source !== 'string') {
    throw new errors.IncorrectUsageError({
      message: `no theme file '${marker.file}' — the marker does not match this theme`,
    });
  }
  return { ...theme, [marker.file]: editFile(source) };
}
