/** Keeps a dialog or sheet open when a toast above it is pressed, which Radix counts as outside. */
const keepOpenOnToast = <E extends Event>(event: E, onInteractOutside?: (event: E) => void) => {
  const { target } = event;
  if (target && 'closest' in target && (target as Element).closest('[data-sonner-toaster]')) {
    event.preventDefault();
  }
  onInteractOutside?.(event);
};

export { keepOpenOnToast };
