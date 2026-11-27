import type { SettingsPanelField } from './sections';

/** Marks the element a settings field is edited in, so the panel can take the writer to it. */
const SETTINGS_FIELD_ATTRIBUTE = 'data-settings-field';

// A field's text entry is preferred over the controls around it, such as a date's calendar button.
const TEXT_ENTRY = 'input:not([type="hidden"]), textarea, [contenteditable="true"]';
const FOCUSABLE = 'button, [tabindex]:not([tabindex="-1"])';

// A pane's code editors load on demand; past this the field is not coming.
const GIVE_UP_MS = 5_000;

function focusTarget(root: HTMLElement, field: SettingsPanelField): HTMLElement | null {
  const container = root.querySelector<HTMLElement>(`[${SETTINGS_FIELD_ATTRIBUTE}="${field}"]`);
  if (!container) {
    return null;
  }
  if (container.matches(TEXT_ENTRY)) {
    return container;
  }
  return (
    container.querySelector<HTMLElement>(TEXT_ENTRY) ??
    (container.matches(FOCUSABLE) ? container : container.querySelector<HTMLElement>(FOCUSABLE))
  );
}

/**
 * Focuses a settings field once it is in the panel, which may be a render or a
 * lazy load away. Calls `done` once it has focused the field or given up, and
 * returns a cleanup that stops waiting.
 */
export function focusSettingsField(
  root: HTMLElement,
  field: SettingsPanelField,
  done: () => void,
): () => void {
  const attempt = (): boolean => {
    const target = focusTarget(root, field);
    if (!target) {
      return false;
    }
    target.focus();
    done();
    return true;
  };

  if (attempt()) {
    return () => undefined;
  }

  const observer = new MutationObserver(() => {
    if (attempt()) {
      observer.disconnect();
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  const giveUp = setTimeout(() => {
    observer.disconnect();
    done();
  }, GIVE_UP_MS);

  return () => {
    observer.disconnect();
    clearTimeout(giveUp);
  };
}
