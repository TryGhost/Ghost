import { useEffect, useRef } from 'react';

/** Mounted editor shortcuts share modifier matching, repeat suppression and cleanup. */
function useShortcut(
  key: 's' | 'p',
  shiftKey: boolean | undefined,
  onPress: () => void,
  enabled = true,
): void {
  const current = useRef({ onPress, enabled });
  current.current = { onPress, enabled };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !current.current.enabled ||
        event.key.toLowerCase() !== key ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        (shiftKey !== undefined && event.shiftKey !== shiftKey)
      ) {
        return;
      }

      event.preventDefault();
      if (!event.repeat) {
        current.current.onPress();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, shiftKey]);
}

/** Cmd/Ctrl+P toggles preview instead of opening the browser's print dialog. */
export function usePreviewShortcut(onToggle: () => void, enabled = true): void {
  useShortcut('p', false, onToggle, enabled);
}

/** Cmd/Ctrl+Shift+P opens the publish flow. */
export function usePublishShortcut(onPublish: () => void, enabled = true): void {
  useShortcut('p', true, onPublish, enabled);
}

/** Cmd/Ctrl+S commits the focused text field before saving, replacing the browser save dialog. */
export function useSaveShortcut(onSave: () => void): void {
  const save = useRef(onSave);
  save.current = onSave;
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useShortcut('s', undefined, () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement && focused.type === 'text') {
      focused.blur();
    }
    // The blur's handlers must land in the session before the save reads it.
    const timer = setTimeout(() => {
      pending.current.delete(timer);
      save.current();
    });
    pending.current.add(timer);
  });
}
