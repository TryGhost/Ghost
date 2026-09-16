type OverlayEscapeHandler = (event: KeyboardEvent) => void;

/**
 * Lets Radix dismiss the active overlay while keeping the same Escape event
 * from reaching legacy document-level shells such as SettingsModal.
 */
const consumeOverlayEscape = (event: KeyboardEvent, onEscapeKeyDown?: OverlayEscapeHandler) => {
  onEscapeKeyDown?.(event);
  if (!event.defaultPrevented) {
    event.stopPropagation();
  }
};

export { consumeOverlayEscape };
