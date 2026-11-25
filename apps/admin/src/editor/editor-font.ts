/**
 * The font the writer reads their post in while editing.
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

export function isEditorFont(value: unknown): value is EditorFont {
  return (EDITOR_BODY_FONTS as readonly unknown[]).includes(value);
}

/**
 * The font a save should send, or null when nothing needs sending. A choice is
 * measured against the save still on its way, when there is one, since that is
 * what the preference will hold once it lands: choosing serif while a save of
 * mono is pending must still send serif.
 */
export function editorFontToSave({
  chosen,
  saved,
  pending,
}: {
  chosen: EditorFont | null;
  saved: EditorFont | undefined;
  pending: EditorFont | null;
}): EditorFont | null {
  if (!chosen) {
    return null;
  }
  const willHold = pending ?? saved ?? DEFAULT_EDITOR_FONT;
  return chosen === willHold ? null : chosen;
}
