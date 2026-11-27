import { createContext } from 'react';

export interface PageHeaderLargeTitle {
  /** Where the title renders large, above the page's header; null until it has mounted. */
  slot: HTMLElement | null;
  /** Called by a title as it mounts; returns its unregister. */
  registerTitle: () => () => void;
}

/**
 * Provided by a page template showing its title large (ListPage, with large
 * titles on): PageHeader.Title then renders large into the slot as well as
 * small in the header, which takes over as the page scrolls. Without it, the
 * title renders as usual.
 */
export const PageHeaderLargeTitleContext = createContext<PageHeaderLargeTitle | null>(null);
