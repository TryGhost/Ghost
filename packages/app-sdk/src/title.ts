import { TITLE_MAX_LENGTH } from '@tryghost/app-contracts';

/** Trims a title to what Admin accepts, without splitting a character in two. */
export function clampTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) {
    return trimmed;
  }
  const end = /[\uD800-\uDBFF]/.test(trimmed.charAt(TITLE_MAX_LENGTH - 1))
    ? TITLE_MAX_LENGTH - 1
    : TITLE_MAX_LENGTH;
  return trimmed.slice(0, end);
}

/**
 * Reports the page's title now and every time it changes, so Admin can show it as its own.
 * Returns a function that stops watching.
 *
 * A title changes by its text being edited, its element being replaced, or one being added
 * where there was none, and frameworks do all three. Rather than tell those apart, every
 * batch of changes in `<head>` reads `document.title` and reports it only if it differs from
 * the last one; a mutation observer already delivers each batch once, in a microtask.
 */
export function watchTitle(report: (title: string) => void): () => void {
  let last: string | undefined;
  const check = () => {
    const title = clampTitle(document.title);
    if (title !== last) {
      last = title;
      report(title);
    }
  };

  check();
  const observer = new MutationObserver(check);
  observer.observe(document.head ?? document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  return () => observer.disconnect();
}
