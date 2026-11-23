// Prototype: show or hide the parts of the post title section's meta line ("By author • date"
// and "View in browser"). Shown only in the Admin preview; nothing here is saved yet.

export interface NewsletterTitleMeta {
  /** The whole "By [author] • date" line. */
  showByline: boolean;
  /** The "View in browser" link. */
  showViewInBrowser: boolean;
}

export const DEFAULT_TITLE_META: NewsletterTitleMeta = {
  showByline: true,
  showViewInBrowser: true,
};
