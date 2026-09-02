import { useEffect, useRef } from 'react';

/** Text inputs commit on blur, so the focused one has to lose focus before the save reads the post. */
function blurFocusedTextInput(): void {
  const focused = document.activeElement;
  if (focused instanceof HTMLInputElement && focused.type === 'text') {
    focused.blur();
  }
}

/**
 * Cmd/Ctrl+S saves whatever is open, replacing the browser's save dialog.
 * Scoped to the mounted editor: nothing listens once the screen unmounts.
 */
export function useSaveShortcut(onSave: () => void): void {
  const save = useRef(onSave);
  save.current = onSave;

  useEffect(() => {
    const pending = new Set<ReturnType<typeof setTimeout>>();

    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (event.key.toLowerCase() !== 's' || !withModifier || event.altKey) {
        return;
      }

      // A held key repeats; one press is one save.
      event.preventDefault();
      if (event.repeat) {
        return;
      }

      blurFocusedTextInput();
      // the blur's handlers have to land in the session before the save reads it
      const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
        pending.delete(timer);
        save.current();
      });
      pending.add(timer);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      pending.forEach(clearTimeout);
    };
  }, []);
}
