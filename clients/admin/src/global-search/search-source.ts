interface SearchItemBase {
  /** Unique within its source. */
  id: string;
  title: string;
  /** Space-separated words that also match, ranked after title matches. */
  keywords?: string;
  /** A post or page status, shown as a badge. */
  status?: string;
}

/** Opens an Admin route. Plain data, so it can come from config. */
export type NavigateItem = SearchItemBase & { kind: 'navigate'; to: string };

/** Runs in place once the search has closed. */
export type ActionItem = SearchItemBase & { kind: 'action'; run: () => void | Promise<void> };

export type SearchItem = NavigateItem | ActionItem;

/** One group of Cmd-K results. */
export interface SearchSource {
  /** Unique across sources; namespaces its item ids. */
  id: string;
  heading: string;
  /** Empty when the group doesn't apply to this user or site. */
  items: readonly SearchItem[];
  /** Results wait until every source has loaded. */
  isLoading: boolean;
  /** Orders a group's matches before it is capped. */
  compare?: (a: SearchItem, b: SearchItem) => number;
}

export interface SearchSourceContext {
  /** The debounced search term. */
  term: string;
  /** False while the term is blank, so sources can hold off loading. */
  enabled: boolean;
}

export interface SearchResultGroup {
  /** The source's id. */
  id: string;
  heading: string;
  items: SearchItem[];
}
