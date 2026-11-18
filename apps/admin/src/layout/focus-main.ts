/**
 * Moves focus to the main content, which is focusable only until focus moves
 * on, so clicks inside still focus what they hit.
 */
export function focusMain(main: HTMLElement, options?: FocusOptions): void {
  main.tabIndex = -1;
  main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
  main.focus(options);
}
