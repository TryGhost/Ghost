/**
 * The font the writer reads their post in while editing (admin7EditorImprovements).
 * A per-user preference that changes only the editor, never the published post.
 */

import { EDITOR_BODY_FONTS } from '@/hooks/user-preferences';

export type EditorFont = (typeof EDITOR_BODY_FONTS)[number];

export const DEFAULT_EDITOR_FONT: EditorFont = 'serif';

/** The picker's choices, in the order it offers them. */
export const EDITOR_FONT_OPTIONS: ReadonlyArray<{ font: EditorFont; label: string }> = [
  { font: 'serif', label: 'Serif' },
  { font: 'sans', label: 'Sans' },
  { font: 'mono', label: 'Mono' },
];

/**
 * The font the editor is set in: the writer's choice while the flag is on, and
 * the editor's own serif otherwise, so a choice saved under the flag waits for it.
 */
export function resolveEditorFont(enabled: boolean, chosen: EditorFont | undefined): EditorFont {
  return enabled && chosen ? chosen : DEFAULT_EDITOR_FONT;
}

export function isEditorFont(value: unknown): value is EditorFont {
  return (EDITOR_BODY_FONTS as readonly unknown[]).includes(value);
}
