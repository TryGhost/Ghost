import { useEffect, useRef } from 'react';

/**
 * Cmd/Ctrl+Shift+P opens the publish flow, the chord the Ember Publish button
 * binds. Scoped to the mounted editor: nothing listens once the screen unmounts.
 */
export function usePublishShortcut(onPublish: () => void, enabled = true): void {
  const publish = useRef(onPublish);
  const isEnabled = useRef(enabled);
  publish.current = onPublish;
  isEnabled.current = enabled;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (
        !isEnabled.current ||
        event.key.toLowerCase() !== 'p' ||
        !withModifier ||
        event.altKey ||
        !event.shiftKey
      ) {
        return;
      }

      // A held key repeats; one press is one flow.
      event.preventDefault();
      if (event.repeat) {
        return;
      }

      publish.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
