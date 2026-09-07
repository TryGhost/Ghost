import { useEffect, useRef } from 'react';

/**
 * Cmd/Ctrl+P toggles the post preview, replacing the browser's print dialog.
 * Scoped to the mounted editor: nothing listens once the screen unmounts.
 */
export function usePreviewShortcut(onToggle: () => void, enabled = true): void {
  const toggle = useRef(onToggle);
  const isEnabled = useRef(enabled);
  toggle.current = onToggle;
  isEnabled.current = enabled;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (
        !isEnabled.current ||
        event.key.toLowerCase() !== 'p' ||
        !withModifier ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      // A held key repeats; one press is one toggle.
      event.preventDefault();
      if (event.repeat) {
        return;
      }

      toggle.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
