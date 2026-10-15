import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditUserPreferences, useUserPreferences } from '@/hooks/user-preferences';
import { type EditorFont, editorFontToSave, resolveEditorFont } from './editor-font';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

export interface EditorFontControl {
  /** The font the editor is set in now. */
  font: EditorFont;
  /** Sets the editor in a font at once and saves it to the writer's preferences. */
  choose: (font: EditorFont) => void;
}

/**
 * The writer's editor font. A choice shows at once and is saved as it is made,
 * as the settings panel's other pickers are; the editor closing saves anything
 * still unsaved. A failed save keeps the choice for this visit and says so.
 *
 * The choice is local, so use this once (the editor screen) and hand it down.
 */
export function useEditorFont(enabled: boolean): EditorFontControl {
  const { data: preferences } = useUserPreferences({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { mutateAsync: editPreferences } = useEditUserPreferences({
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const [chosen, setChosen] = useState<EditorFont | null>(null);
  const saved = preferences?.editor?.bodyFont;
  const font = resolveEditorFont(enabled, chosen ?? saved);

  // Read when saving, which can happen as the editor unmounts.
  const latest = useRef({ chosen, saved, editPreferences });
  useEffect(() => {
    latest.current = { chosen, saved, editPreferences };
  }, [chosen, saved, editPreferences]);
  // The font of the latest save still on its way. Saves run one after another,
  // so once it lands the preference holds this font.
  const sending = useRef<EditorFont | null>(null);

  // Saves the given choice, or the latest one, unless the preference already holds it.
  const save = useCallback((choice: EditorFont | null = latest.current.chosen) => {
    const { saved: stored, editPreferences: edit } = latest.current;
    const next = editorFontToSave({ chosen: choice, saved: stored, pending: sending.current });
    if (!next) {
      return;
    }
    sending.current = next;
    edit({ editor: { bodyFont: next } })
      .catch(() => {
        toast.error("Couldn't save your editor font");
      })
      .finally(() => {
        if (sending.current === next) {
          sending.current = null;
        }
      });
  }, []);

  // Runs as the editor unmounts; a choice already on its way sends nothing more.
  useEffect(() => () => save(), [save]);

  const choose = useCallback(
    (next: EditorFont) => {
      setChosen(next);
      save(next);
    },
    [save],
  );

  return { font, choose };
}
