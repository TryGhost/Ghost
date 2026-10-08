import type React from 'react';

const CONTROLS = 'a, button, input, select, textarea';

function linkOf(row: HTMLElement): HTMLAnchorElement | null {
  return row.querySelector<HTMLAnchorElement>('a[href]');
}

/**
 * Makes a whole table row open the link it contains, like clicking the link itself. The
 * link stays a real link, so it can be focused, copied and opened in a new tab, and a
 * click with a modifier key opens the row's link in a new tab too. Clicks on the row's
 * other controls, and on content portalled out of the row such as a menu, are left alone.
 */
export function openRowLink(event: React.MouseEvent<HTMLElement>): void {
  if (
    event.defaultPrevented ||
    !(event.target instanceof Element) ||
    !event.currentTarget.contains(event.target) ||
    event.target.closest(CONTROLS)
  ) {
    return;
  }
  const link = linkOf(event.currentTarget);
  if (!link) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    window.open(link.href, '_blank', 'noopener');
    return;
  }
  link.click();
}

/** Opens the row's link in a new tab on a middle click, as a link would. */
export function openRowLinkInNewTab(event: React.MouseEvent<HTMLElement>): void {
  if (
    event.button !== 1 ||
    !(event.target instanceof Element) ||
    !event.currentTarget.contains(event.target) ||
    event.target.closest(CONTROLS)
  ) {
    return;
  }
  const link = linkOf(event.currentTarget);
  if (link) {
    event.preventDefault();
    window.open(link.href, '_blank', 'noopener');
  }
}
