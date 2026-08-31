import { page } from 'vitest/browser';
import {
  listPage,
  postFeaturedMarker,
  postListItemAction,
  postListItemLink,
  postMetricPanel,
  postsEmptyCold,
  postsEmptyFiltered,
  postsFilters,
  postsList,
  postsListItem,
  postsSort,
} from '@tryghost/test-data/selectors/posts';

/**
 * Locator vocabulary for the React posts and pages list screens. The testid
 * strings live in `@tryghost/test-data/selectors/posts`, shared with the e2e
 * page objects.
 *
 * Page-scoped locators go through `page(resource)`: the admin sidebar carries
 * its own "Create new post" link, so an unscoped role query matches twice.
 * Which implementation is serving a route is asserted via `page(resource)`,
 * which only the React screen renders.
 */
/**
 * A cmd-click on a row is a cmd-click on a *link*, which opens a new browser
 * tab — dispatching the mousedown directly exercises the selection path
 * without asking the browser to open tabs mid-suite. Ember behaves the same.
 */
export function metaMouseDown(element: Element): void {
  element.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    }),
  );
}

export const postsListScreen = {
  page: (resource: 'posts' | 'pages') => page.getByTestId(listPage(resource)),
  title: (resource: 'posts' | 'pages', name: string) =>
    page.getByTestId(listPage(resource)).getByRole('heading', { name }),
  // `exact` matters: the cold empty state also offers "Write a new post",
  // which a substring match on "New post" would pick up too.
  newLink: (resource: 'posts' | 'pages', name: string) =>
    page.getByTestId(listPage(resource)).getByRole('link', { name, exact: true }),
  listItems: () => page.getByTestId(postsListItem),
  /** The <ul>. Carries `data-selection` so an inverted selection is observable. */
  listRoot: () => page.getByTestId(postsList).element(),
  /**
   * Titles of the currently selected rows, keyed off the same `data-selected`
   * attribute Ember sets. Read as elements rather than as a locator because
   * Vitest's locators have no attribute selector; pair it with `expect.poll`
   * so it still retries while React settles.
   */
  selectedTitles: () =>
    postsListScreen
      .listItems()
      .elements()
      .filter((element) => element.getAttribute('data-selected') === 'true')
      .map((element) => element.querySelector('h3')?.textContent ?? ''),
  /** The row's main link — the image and title region. */
  rowLink: () => page.getByTestId(postListItemLink),
  /** A metric column, found by its label ("Opens", "Members", …). */
  metricCell: (label: string) =>
    page.getByTestId(postsListItem).getByLabelText(new RegExp(label)).first(),
  /** The hover breakdown, which Radix portals out of the row. */
  metricPanel: () => page.getByTestId(postMetricPanel),
  /** The right-click menu, which Radix portals out of the list. */
  contextMenu: () => page.getByRole('menu'),
  contextMenuItem: (label: string) => page.getByRole('menuitem', { name: label, exact: true }),
  /**
   * Toasts render into Shade's Sonner portal, outside the list. Matched by
   * text: these strings appear nowhere else on the screen.
   */
  toastWithText: (text: string | RegExp) => page.getByText(text),
  /** A button inside a non-destructive modal (Add a tag, Change access). */
  dialogButton: (label: string) =>
    page.getByRole('dialog').getByRole('button', { name: label, exact: true }),
  /** A row in the tag picker's list — a `cmdk` item, so `option`. */
  tagOption: (name: string | RegExp) => page.getByRole('dialog').getByRole('option', { name }),
  tagSearchInput: () => page.getByRole('dialog').getByLabelText('Search tags'),
  /** The chip field. Click it to open the list, as the chevron invites. */
  tagPickerField: () => page.getByTestId('tag-picker'),
  /**
   * The dialog's own heading, used to dismiss the tag list: it floats over
   * the footer, so the confirm button cannot be reached until something
   * outside the list is clicked — which is what a user does too.
   */
  dialogHeading: (name: string) => page.getByRole('dialog').getByRole('heading', { name }),
  /** The confirm button inside a bulk-action modal. */
  confirmButton: (label: string) =>
    page.getByRole('alertdialog').getByRole('button', { name: label, exact: true }),
  bulkModal: () => page.getByRole('alertdialog'),
  /**
   * The post-publish celebration, handed over from the Ember editor.
   *
   * Located by role, not testid: `PostShareModal` spreads its extra props
   * onto Radix's `Dialog.Root`, which renders no DOM node at all, so a
   * testid passed to it has nowhere to land.
   */
  celebrationModal: () => page.getByRole('dialog').filter({ hasText: /published|All set/ }),
  /** The gift-link modal, opened from the context menu. */
  giftLinkModal: () => page.getByRole('dialog', { name: /gift/i }),
  /** The trailing button at a row's end — Analytics, View, or Editor. */
  rowAction: () => page.getByTestId(postListItemAction),
  featuredMarkers: () => page.getByTestId(postFeaturedMarker),
  emptyCold: () => page.getByTestId(postsEmptyCold),
  emptyFiltered: () => page.getByTestId(postsEmptyFiltered),
  showAllButton: (plural: string) => page.getByRole('button', { name: `Show all ${plural}` }),
  filterBar: () => page.getByTestId(postsFilters),
  addFilterButton: () => page.getByTestId(postsFilters).getByRole('button', { name: 'Filter' }),
  /** A field in the add-filter popover, which renders into a portal. */
  filterFieldOption: (label: string) => page.getByRole('option', { name: label, exact: true }),
  sortButton: () => page.getByTestId(postsSort),
  /** Radio items, so the active sort is announced and visibly checked. */
  sortOption: (label: string) => page.getByRole('menuitemradio', { name: label, exact: true }),
};
