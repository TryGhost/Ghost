import errors from '@tryghost/errors';
import { RAWTEXT_TAGS, scanAttributes, scanSourceTags } from '../engine/source-scanner.ts';
import { EDIT_MARKER_ATTRIBUTE } from '../engine/markers.ts';
import { editThemeFile, resolveMarkedOpenTag } from './edit-common.ts';
import { applyTextEdit, VOID_TAGS } from './text-edit.ts';
import type { EditAnchor } from './edit-common.ts';
import type { EditMarker } from '../engine/markers.ts';
import type { ThemeFiles } from '../theme/theme-source.ts';

// A literal editor replaces the whole direct text child. Anything requiring
// expression evaluation or nested DOM correspondence belongs to source editing.
function hasLiteralChild(source: string, tagName: string, end: number, selfClosing: boolean) {
  if (selfClosing || VOID_TAGS.has(tagName) || RAWTEXT_TAGS.has(tagName)) {
    return false;
  }
  const nextTag = source.indexOf('<', end + 1);
  if (nextTag < 0) {
    return false;
  }
  const text = source.slice(end + 1, nextTag);
  const closing = /^<\/([a-z][a-z0-9:-]*)\s*>/i.exec(source.slice(nextTag));
  return Boolean(text.trim() && !text.includes('{{') && closing?.[1]?.toLowerCase() === tagName);
}

/** Source-derived eligible marker → tag. A rendered marker alone is not proof. */
export function getThemeLiteralTextTargets(
  theme: ThemeFiles,
  attributeName = EDIT_MARKER_ATTRIBUTE,
): Record<string, string> {
  const targets: Record<string, string> = {};
  const authoredAliases = new Set<string>();
  for (const [file, source] of theme instanceof Map ? theme : Object.entries(theme)) {
    if (!file.endsWith('.hbs')) {
      continue;
    }
    for (const tag of scanSourceTags(source)) {
      const name = tag.tagName.toLowerCase();
      let authored = false;
      for (const attribute of scanAttributes(source, tag.nameEnd, tag.end)) {
        if (attribute.name !== attributeName) {
          continue;
        }
        authored = true;
        const token = source.slice(attribute.start, attribute.end);
        const match = /^[^=]+(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s]*)))?$/.exec(token);
        const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
        // Unknown rendered aliases could target any otherwise eligible tag.
        if (!match || value.includes('{{') || value.includes('&')) {
          return {};
        }
        authoredAliases.add(value);
      }
      if (
        !authored &&
        tag.markable &&
        tag.closed &&
        hasLiteralChild(source, name, tag.end, tag.selfClosing)
      ) {
        targets[`${file}:${tag.line}:${tag.column}`] = name;
      }
    }
  }
  for (const alias of authoredAliases) {
    delete targets[alias];
  }
  return targets;
}

/** Exact-position literal-only edit. Callers also guard their source revision. */
export function applyThemeLiteralTextEdit<T extends ThemeFiles>(
  theme: T,
  marker: EditMarker,
  newText: string,
  anchor: EditAnchor,
): T {
  return editThemeFile(theme, marker, (source) => {
    // Do not relocate a stale canvas target to another source location.
    const tag = resolveMarkedOpenTag(source, marker);
    if (
      tag.tagName !== anchor.tagName.toLowerCase() ||
      !hasLiteralChild(source, tag.tagName, tag.tagEnd.end, tag.tagEnd.selfClosing)
    ) {
      throw new errors.IncorrectUsageError({
        message:
          'Inline editing requires a single literal theme text child. Select dynamic output or nested markup to edit its source or settings.',
      });
    }
    return applyTextEdit(source, marker, newText, anchor);
  });
}
