/**
 * Keeps a dialog or sheet open when the publisher presses a toast above it, which Radix would
 * count as a press outside, then calls the caller's own handler.
 */
const keepOpenOnToast = <E extends Event>(event: E, onInteractOutside?: (event: E) => void) => {
  const { target } = event;
  if (target && 'closest' in target && (target as Element).closest('[data-sonner-toaster]')) {
    event.preventDefault();
  }
  onInteractOutside?.(event);
};

export { keepOpenOnToast };
