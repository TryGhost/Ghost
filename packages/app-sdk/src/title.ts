import { TITLE_MAX_LENGTH, toPlainText } from '@tryghost/app-contracts';

/**
 * Trims a title to what Admin accepts, without splitting a character in two. Admin refuses a
 * title containing a character that reorders or hides text, so the SDK drops those characters
 * rather than losing the whole title: a right-to-left title often contains a direction mark.
 */
function clampTitle(title: string): string {
  const trimmed = toPlainText(title).trim();
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
 * A title can change in three ways, and frameworks use all three: its text is edited, its
 * element is replaced, or an element is added where there was none. Rather than distinguish
 * them, the SDK reads `document.title` after every batch of changes in `<head>` and reports it
 * only if it differs from the last one. A mutation observer already delivers each batch once,
 * in a microtask.
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
