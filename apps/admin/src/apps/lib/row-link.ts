import type React from 'react';

const CONTROLS = 'a, button, input, select, textarea';

function linkOf(row: HTMLElement): HTMLAnchorElement | null {
  return row.querySelector<HTMLAnchorElement>('a[href]');
}

/**
 * React bubbles clicks from portals, such as the row's menu, up through the row, so
 * `contains` leaves those alone.
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
